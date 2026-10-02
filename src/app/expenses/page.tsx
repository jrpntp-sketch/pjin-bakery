"use client";

import { useState } from "react";
import { db, newId, now } from "@/lib/db";
import { useExpenses } from "@/lib/hooks";
import { toNum } from "@/lib/calc";
import { money, monthStartISO, thaiDate, todayISO } from "@/lib/format";
import { Button, Card, Empty, Field, inputClass, numberInput, PageHeader, Stat } from "@/components/ui";

/* หมวดหมู่แยกตามทิศทางของเงิน — รายรับกับรายจ่ายใช้คำคนละชุด */
const CAT_OUT = [
  "อุปกรณ์/เครื่องครัว", "ค่าที่/ค่าบูธ", "การตลาด",
  "วัตถุดิบสำรอง", "ค่าเดินทาง", "อื่นๆ",
];
const CAT_IN = [
  "ขายอุปกรณ์เก่า", "เงินทุนเพิ่ม", "เงินคืน/ส่วนลดย้อนหลัง",
  "รายได้อื่น", "อื่นๆ",
];

export default function EntriesPage() {
  const rows = useExpenses();
  const [kind, setKind] = useState<"in" | "out">("out");
  const [saved, setSaved] = useState(false);

  if (!rows) return <div className="h-40 animate-pulse rounded-3xl bg-cream-100" />;

  const monthStart = monthStartISO();
  const sum = (list: typeof rows) => list.reduce((s, e) => s + e.amount, 0);
  const monthIn = sum(rows.filter((e) => e.kind === "in" && e.spentOn >= monthStart));
  const monthOut = sum(rows.filter((e) => e.kind !== "in" && e.spentOn >= monthStart));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // ต้องเก็บ form ไว้ก่อน await เพราะ React เคลียร์ currentTarget หลังจบรอบ event
    const form = e.currentTarget;
    const fd = new FormData(form);
    const amount = toNum(fd.get("amount"));
    if (amount <= 0) return;

    await db.expenses.add({
      id: newId(),
      kind,
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

  const isIn = kind === "in";

  return (
    <>
      <PageHeader
        title="รับ-จ่ายอื่น"
        subtitle="เงินเข้าออกที่ไม่ได้มาจากการผลิตหรือการขาย"
      />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Stat label="รายรับอื่นเดือนนี้" value={money(monthIn)} tone="good" />
        <Stat label="รายจ่ายอื่นเดือนนี้" value={money(monthOut)} tone="bad" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Card title="ประวัติ">
          {rows.length === 0 ? (
            <Empty icon="💸">ยังไม่มีรายการ</Empty>
          ) : (
            <ul className="divide-y divide-cream-100">
              {rows.map((e) => {
                const income = e.kind === "in";
                return (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-plum-700">{e.category}</p>
                      <p className="truncate text-xs text-plum-400">
                        {thaiDate(e.spentOn)}
                        {e.note && ` · ${e.note}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`tabular font-semibold ${income ? "text-leaf-500" : "text-berry-500"}`}>
                        {income ? "+" : "−"}{money(e.amount)}
                      </span>
                      <button type="button" onClick={() => db.expenses.delete(e.id)}
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-plum-400 transition hover:bg-berry-500/10 hover:text-berry-500">
                        ลบ
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="lg:sticky lg:top-5 lg:self-start">
          <Card title="เพิ่มรายการ">
            <form onSubmit={submit} className="space-y-3.5">
              {/* เลือกทิศทางเงินก่อน เพราะหมวดหมู่เปลี่ยนตาม */}
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-cream-100 p-1">
                {([["out", "จ่ายออก"], ["in", "รับเข้า"]] as const).map(([k, label]) => (
                  <button key={k} type="button" onClick={() => setKind(k)}
                    className={`rounded-lg py-2 text-sm font-semibold transition ${
                      kind === k
                        ? k === "in"
                          ? "bg-white text-leaf-500 shadow-sm"
                          : "bg-white text-berry-500 shadow-sm"
                        : "text-plum-400 hover:text-plum-600"
                    }`}>
                    {label}
                  </button>
                ))}
              </div>

              <Field label="หมวดหมู่">
                {/* key บังคับให้ select สร้างใหม่ตอนสลับ ไม่งั้นค่าเดิมค้างข้ามชุด */}
                <select key={kind} name="category" className={inputClass}>
                  {(isIn ? CAT_IN : CAT_OUT).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>

              <div className="grid gap-3 sm:grid-cols-2 [&>*]:min-w-0">
                <Field label="จำนวนเงิน">
                  <input name="amount" {...numberInput} required placeholder="0.00" className={inputClass} />
                </Field>
                <Field label="วันที่">
                  <input name="spentOn" type="date" defaultValue={todayISO()} className={inputClass} />
                </Field>
              </div>

              <Field label="รายละเอียด (ไม่บังคับ)">
                <input name="note"
                  placeholder={isIn ? "เช่น ขายเตาอบเก่า" : "เช่น เครื่องตีแป้ง"}
                  className={inputClass} />
              </Field>

              {saved && (
                <p className="rounded-xl bg-leaf-500/10 px-3 py-2 text-sm text-leaf-500">
                  บันทึกแล้ว ✓
                </p>
              )}

              <Button type="submit" className="w-full">
                {isIn ? "เพิ่มรายรับ" : "เพิ่มรายจ่าย"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
