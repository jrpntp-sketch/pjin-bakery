"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { numField, strField } from "@/lib/pricing";

export type FormState = { error?: string; ok?: boolean };

export async function saveProduct(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { supabase, user } = await requireUser();

  const name = strField(fd, "name");
  if (!name) return { error: "กรุณาใส่ชื่อสินค้า" };

  const row = {
    user_id: user.id,
    name,
    unit: strField(fd, "unit", "ชิ้น"),
    base_price: numField(fd, "base_price"),
    low_stock_threshold: Math.max(0, Math.round(numField(fd, "low_stock_threshold", 5))),
    notes: strField(fd, "notes") || null,
    is_active: fd.get("is_active") !== null,
  };

  const id = strField(fd, "id");
  const { error } = id
    ? await supabase.from("products").update(row).eq("id", id)
    : await supabase.from("products").insert(row);

  if (error) return { error: error.message };

  revalidatePath("/products");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteProduct(fd: FormData) {
  const { supabase } = await requireUser();
  const id = strField(fd, "id");
  if (!id) return;

  const { error } = await supabase.from("products").delete().eq("id", id);

  // มีธุรกรรมอ้างอิงอยู่ (on delete restrict) -> ปิดการใช้งานแทนการลบ
  if (error) {
    await supabase.from("products").update({ is_active: false }).eq("id", id);
  }

  revalidatePath("/products");
  revalidatePath("/");
}
