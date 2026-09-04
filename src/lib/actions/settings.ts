"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { numField, strField } from "@/lib/pricing";
import type { FormState } from "./products";

export async function saveSettings(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { supabase, user } = await requireUser();

  const wage = numField(fd, "hourly_wage");
  if (wage < 0) return { error: "ค่าแรงต้องไม่ติดลบ" };

  const { error } = await supabase.from("settings").upsert(
    {
      user_id: user.id,
      shop_name: strField(fd, "shop_name", "ร้านขนม"),
      currency: strField(fd, "currency", "THB"),
      hourly_wage: wage,
    },
    { onConflict: "user_id" },
  );

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
