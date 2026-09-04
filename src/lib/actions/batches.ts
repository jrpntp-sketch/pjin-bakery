"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { numField, strField, round2 } from "@/lib/pricing";
import { todayISO } from "@/lib/format";
import type { FormState } from "./products";

type MaterialLine = { name: string; cost: number };

/** อ่านรายการวัตถุดิบย่อยจากฟอร์ม (ชื่อฟิลด์ material_name[] / material_cost[]) */
function readMaterials(fd: FormData): MaterialLine[] {
  const names = fd.getAll("material_name").map(String);
  const costs = fd.getAll("material_cost").map((c) => Number(c) || 0);
  return names
    .map((name, i) => ({ name: name.trim(), cost: costs[i] ?? 0 }))
    .filter((m) => m.name !== "" || m.cost > 0)
    .map((m) => ({ name: m.name || "วัตถุดิบ", cost: m.cost }));
}

export async function saveBatch(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { supabase, user } = await requireUser();

  const productId = strField(fd, "product_id");
  if (!productId) return { error: "กรุณาเลือกสินค้า" };

  const qty = numField(fd, "qty_produced");
  if (qty <= 0) return { error: "จำนวนที่ได้ต้องมากกว่า 0" };

  const materials = readMaterials(fd);
  const useLines = materials.length > 0;
  const materialCost = useLines
    ? round2(materials.reduce((s, m) => s + m.cost, 0))
    : numField(fd, "material_cost_total");

  // ใช้ค่าแรงที่ตั้งไว้ ณ ตอนบันทึก แล้วเก็บเป็น snapshot ไว้กับรอบผลิต
  const { data: settings } = await supabase
    .from("settings")
    .select("hourly_wage")
    .eq("user_id", user.id)
    .maybeSingle();

  const row = {
    user_id: user.id,
    product_id: productId,
    produced_on: strField(fd, "produced_on", todayISO()),
    qty_produced: qty,
    hours_spent: numField(fd, "hours_spent"),
    hourly_wage_snapshot: numField(fd, "hourly_wage", settings?.hourly_wage ?? 0),
    material_cost: materialCost,
    overhead_cost: numField(fd, "overhead_cost"),
    notes: strField(fd, "notes") || null,
  };

  const { data: batch, error } = await supabase
    .from("batches")
    .insert(row)
    .select("id")
    .single();

  if (error) return { error: error.message };

  if (useLines && batch) {
    const { error: matError } = await supabase.from("batch_materials").insert(
      materials.map((m) => ({ batch_id: batch.id, name: m.name, cost: m.cost })),
    );
    // ถ้าใส่รายการย่อยไม่สำเร็จ ยอดรวมที่บันทึกไปแล้วยังถูกต้อง — แจ้งเตือนเฉย ๆ
    if (matError) {
      revalidatePath("/batches");
      return { error: `บันทึกรอบผลิตแล้ว แต่รายการวัตถุดิบย่อยมีปัญหา: ${matError.message}` };
    }
  }

  revalidatePath("/batches");
  revalidatePath("/");
  revalidatePath("/reports");
  return { ok: true };
}

export async function deleteBatch(fd: FormData) {
  const { supabase } = await requireUser();
  const id = strField(fd, "id");
  if (!id) return;

  await supabase.from("batches").delete().eq("id", id);

  revalidatePath("/batches");
  revalidatePath("/");
  revalidatePath("/reports");
}
