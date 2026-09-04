"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { numField, strField } from "@/lib/pricing";
import { todayISO } from "@/lib/format";
import type { FormState } from "./products";

export async function saveExpense(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { supabase, user } = await requireUser();

  const amount = numField(fd, "amount");
  if (amount <= 0) return { error: "จำนวนเงินต้องมากกว่า 0" };

  const row = {
    user_id: user.id,
    category: strField(fd, "category", "อื่นๆ"),
    amount,
    spent_on: strField(fd, "spent_on", todayISO()),
    note: strField(fd, "note") || null,
  };

  const id = strField(fd, "id");
  const { error } = id
    ? await supabase.from("expenses").update(row).eq("id", id)
    : await supabase.from("expenses").insert(row);

  if (error) return { error: error.message };

  revalidatePath("/expenses");
  revalidatePath("/reports");
  return { ok: true };
}

export async function deleteExpense(fd: FormData) {
  const { supabase } = await requireUser();
  const id = strField(fd, "id");
  if (!id) return;

  await supabase.from("expenses").delete().eq("id", id);

  revalidatePath("/expenses");
  revalidatePath("/reports");
}
