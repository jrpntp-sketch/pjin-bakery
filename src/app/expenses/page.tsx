"use client";

import { useState } from "react";
import { toNum } from "@/lib/calc";
import { db, newId, now } from "@/lib/db";
import { useExpenses } from "@/lib/hooks";
import { money, monthStartISO, thaiDate, todayISO } from "@/lib/format";
import { Button, Card, Empty, Field, inputClass, numberInput, PageHeader, Stat } from "@/components/ui";

const CATEGORIES = [
  "อุปกรณ์/เครื่องครัว", "ค่าที่/ค่าบูธ", "การตลาด",
  "วัตถุดิบสำรอง", "ค่าเดินทาง", "อื่นๆ",
];

export default function ExpensesPage() {
  const expenses = useExpenses();
  const [saved, setSaved] = useState(false);

  if (!expenses) return <div className="h-40 animate-pulse rounded-2xl bg-cream-100" />;

  const monthStart = monthStartISO();
  const monthTotal = expenses.filter((e) => e.spentOn >= monthStart)
    .reduce((s, e) => s + e.amount, 0);
  const allTotal = expenses.reduce((s, e) => s + e.amount, 0);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const amount = toNum(fd.get("amount"));
    if (amount <= 0) return;

    await db.expenses.add({
      id: newId(),
      category: String(fd.get("category") ?? "อื่นๆ"),
      amount,
      spentOn: String(fd.get("spentOn") ?? todayISO()),
      note: String(fd.get("note") ?? "").trim() || undefined,
      createdAt: now(),
    });
    form.reset();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      <PageHeader title="รายจ่ายอื่น"
        subtitle="ของที่ไม่ผูกกับรอบผลิต เช่น ซื้อเตาใหม่ ค่าสมัครตลาดนัด" />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Stat label="รายจ่ายเดือนนี้" value={money(monthTotal)} tone="bad" />
        <Stat label="รวมทั้งหมด" value={money(allTotal)} hint={`${expenses.length} รายการ`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Card title="ประวัติรายจ่าย">
          {expenses.length === 0 ? (
            <Empty icon="💸">ยังไม่มีรายจ่ายอื่น</Empty>
          ) : (
            <ul className="divide-y divide-cream-100">
              {expenses.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-semibold text-cocoa-700">{e.category}</p>
                    <p className="text-xs text-cocoa-400">
                      {thaiDate(e.spentOn)}{e.note && ` · ${e.note}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="tabular font-semibold text-berry-500">−{money(e.amount)}</span>
                    <button type="button" onClick={() => db.expenses.delete(e.id)}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-cocoa-400 transition hover:bg-berry-500/10 hover:text-berry-500">
                      ลบ
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="lg:sticky lg:top-5 lg:self-start">
          <Card title="เพิ่มรายจ่าย">
            <form onSubmit={submit} className="space-y-3.5">
              <Field label="หมวดหมู่">
                <select name="category" defaultValue="อื่นๆ" className={inputClass}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="จำนวนเงิน">
                  <input name="amount" {...numberInput} required placeholder="0.00" className={inputClass} />
                </Field>
                <Field label="วันที่">
                  <input name="spentOn" type="date" defaultValue={todayISO()} className={inputClass} />
                </Field>
              </div>
              <Field label="รายละเอียด (ไม่บังคับ)">
                <input name="note" placeholder="เช่น เครื่องตีแป้ง" className={inputClass} />
              </Field>
              {saved && <p className="rounded-xl bg-leaf-500/10 px-3 py-2 text-sm text-leaf-500">บันทึกแล้ว ✓</p>}
              <Button type="submit" className="w-full">เพิ่มรายจ่าย</Button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
