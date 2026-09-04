"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { numField, strField } from "@/lib/pricing";
import type { ShareType } from "@/lib/types";
import type { FormState } from "./products";

export async function saveChannel(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { supabase, user } = await requireUser();

  const name = strField(fd, "name");
  if (!name) return { error: "กรุณาใส่ชื่อช่องทาง" };

  const shareType = strField(fd, "share_type", "none") as ShareType;
  if (!["none", "percent", "fixed"].includes(shareType)) {
    return { error: "ประเภทส่วนแบ่งไม่ถูกต้อง" };
  }

  const sharePercent = numField(fd, "share_percent");
  if (shareType === "percent" && (sharePercent <= 0 || sharePercent > 100)) {
    return { error: "ส่วนแบ่งต้องอยู่ระหว่าง 0–100%" };
  }

  const row = {
    user_id: user.id,
    name,
    share_type: shareType,
    share_percent: shareType === "percent" ? sharePercent : 0,
    fixed_price: shareType === "fixed" ? numField(fd, "fixed_price") : 0,
    shipping_cost_per_trip: numField(fd, "shipping_cost_per_trip"),
    is_active: fd.get("is_active") !== null,
  };

  const id = strField(fd, "id");
  const { error } = id
    ? await supabase.from("channels").update(row).eq("id", id)
    : await supabase.from("channels").insert(row);

  if (error) return { error: error.message };

  revalidatePath("/channels");
  revalidatePath("/sales");
  return { ok: true };
}

export async function deleteChannel(fd: FormData) {
  const { supabase } = await requireUser();
  const id = strField(fd, "id");
  if (!id) return;

  const { error } = await supabase.from("channels").delete().eq("id", id);
  if (error) {
    await supabase.from("channels").update({ is_active: false }).eq("id", id);
  }

  revalidatePath("/channels");
  revalidatePath("/sales");
}
