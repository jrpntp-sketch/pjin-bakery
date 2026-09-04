"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveExpense } from "@/lib/actions/expenses";
import type { FormState } from "@/lib/actions/products";
import { Button, Card, Field, inputClass } from "@/components/ui";

const EMPTY: FormState = {};

const CATEGORIES = [
  "อุปกรณ์/เครื่องครัว",
  "ค่าที่/ค่าบูธ",
  "การตลาด",
  "วัตถุดิบสำรอง",
  "ค่าเดินทาง",
  "อื่นๆ",
];

export function ExpenseForm({ today }: { today: string }) {
  const [state, formAction, pending] = useActionState(saveExpense, EMPTY);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <Card title="เพิ่มรายจ่าย">
      <form ref={formRef} action={formAction} className="space-y-3.5">
        <Field label="หมวดหมู่">
          <select name="category" className={inputClass} defaultValue="อื่นๆ">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="จำนวนเงิน">
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              inputMode="decimal"
              placeholder="0.00"
              className={inputClass}
            />
          </Field>
          <Field label="วันที่">
            <input
              name="spent_on"
              type="date"
              defaultValue={today}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="รายละเอียด (ไม่บังคับ)">
          <input
            name="note"
            placeholder="เช่น เครื่องตีแป้ง KitchenAid"
            className={inputClass}
          />
        </Field>

        {state.error && (
          <p className="rounded-xl bg-berry-500/10 px-3 py-2 text-sm text-berry-500">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p className="rounded-xl bg-mint-500/10 px-3 py-2 text-sm text-mint-500">
            บันทึกแล้ว ✓
          </p>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "กำลังบันทึก…" : "เพิ่มรายจ่าย"}
        </Button>
      </form>
    </Card>
  );
}
