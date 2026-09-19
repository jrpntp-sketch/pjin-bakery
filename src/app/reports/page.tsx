"use client";

import { useState } from "react";
import { useReport } from "@/lib/hooks";
import { money, monthStartISO, num, todayISO } from "@/lib/format";
import { Card, Empty, inputClass, PageHeader, Stat } from "@/components/ui";

const PRESETS = [
  { label: "7 วัน", days: 7 },
  { label: "30 วัน", days: 30 },
  { label: "90 วัน", days: 90 },
] as const;

const iso = (d: Date) => d.toLocaleDateString("en-CA");

export default function ReportsPage() {
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(todayISO());
  const r = useReport(from, to);

  const preset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    setFrom(iso(start));
    setTo(iso(end));
  };

  const thisMonth = () => {
    const n = new Date();
    setFrom(iso(new Date(n.getFullYear(), n.getMonth(), 1)));
    setTo(iso(n));
  };

  if (!r) return <div className="h-40 animate-pulse rounded-2xl bg-cream-100" />;

  const bottomLine = r.totals.net - r.otherExpenses;
  const hiddenCost = r.totals.gross - r.totals.net;

  return (
    <>
      <PageHeader title="รายงาน"
        subtitle="ช่องว่างระหว่างกำไรขั้นต้นกับสุทธิ คือค่าแรงและค่าแฝงที่มักถูกลืม" />

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex-1">
            <span className="mb-1.5 block text-xs font-semibold text-plum-600">ตั้งแต่</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
          </label>
          <label className="flex-1">
            <span className="mb-1.5 block text-xs font-semibold text-plum-600">ถึง</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
          </label>
          <div className="flex gap-1.5">
            <button type="button" onClick={thisMonth}
              className="rounded-xl border border-cream-200 px-3 py-2.5 text-xs font-semibold text-plum-600 transition hover:bg-cream-100">
              เดือนนี้
            </button>
            {PRESETS.map((p) => (
              <button key={p.days} type="button" onClick={() => preset(p.days)}
                className="rounded-xl border border-cream-200 px-3 py-2.5 text-xs font-semibold text-plum-600 transition hover:bg-cream-100">
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="ยอดขายรวม" value={money(r.totals.revenue)}
          hint={`${r.totals.orders} รายการ · ${num(r.totals.units)} ชิ้น`} />
        <Stat label="กำไรขั้นต้น" value={money(r.totals.gross)} hint="หักเฉพาะวัตถุดิบ" />
        <Stat label="กำไรสุทธิ" value={money(r.totals.net)}
          hint={`ถูกกินไป ${money(hiddenCost)} จากแรง+แฝง+ส่วนแบ่ง`}
          tone={r.totals.net > 0 ? "good" : r.totals.net < 0 ? "bad" : "neutral"} />
        <Stat label="เหลือจริง" value={money(bottomLine)}
          hint={`หลังหักรายจ่ายอื่น ${money(r.otherExpenses)}`}
          tone={bottomLine > 0 ? "good" : bottomLine < 0 ? "bad" : "neutral"} />
      </div>

      {r.count === 0 ? (
        <Card><Empty icon="📈">ช่วงเวลานี้ยังไม่มีรายการขาย</Empty></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Breakdown title="แยกตามสินค้า" subtitle="เรียงจากกำไรสุทธิมากไปน้อย" rows={r.byProduct} />
          <Breakdown title="แยกตามช่องทางขาย" subtitle="ที่ไหนคุ้มกว่ากัน" rows={r.byChannel} />
        </div>
      )}
    </>
  );
}

function Breakdown({ title, subtitle, rows }: {
  title: string;
  subtitle: string;
  rows: Array<{ id: string; label: string; revenue: number; gross: number; net: number; units: number }>;
}) {
  const max = Math.max(...rows.map((r) => Math.abs(r.gross)), 1);

  return (
    <Card title={title} action={<span className="text-xs text-plum-400">{subtitle}</span>}>
      <ul className="space-y-4">
        {rows.map((r) => {
          const margin = r.revenue > 0 ? (r.net / r.revenue) * 100 : 0;
          return (
            <li key={r.id}>
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-semibold text-plum-700">{r.label}</p>
                <p className="tabular shrink-0 text-xs text-plum-400">
                  {num(r.units)} ชิ้น · {money(r.revenue)}
                </p>
              </div>
              <div className="space-y-1">
                <Bar label="ขั้นต้น" value={money(r.gross)}
                  pct={(Math.abs(r.gross) / max) * 100} className="bg-plum-400" />
                <Bar label="สุทธิ" value={money(r.net)}
                  pct={(Math.abs(r.net) / max) * 100}
                  className={r.net >= 0 ? "bg-leaf-500" : "bg-berry-500"} />
              </div>
              <p className={`mt-1 text-xs font-medium ${
                r.net < 0 ? "text-berry-500" : margin < 15 ? "text-peach-600" : "text-plum-400"}`}>
                {r.net < 0 ? "⚠️ ขาดทุนเมื่อคิดค่าแรง"
                  : margin < 15 ? `มาร์จิ้นสุทธิ ${margin.toFixed(0)}% — บาง`
                  : `มาร์จิ้นสุทธิ ${margin.toFixed(0)}%`}
              </p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Bar({ label, value, pct, className }: {
  label: string; value: string; pct: number; className: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-xs text-plum-400">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream-100">
        <div className={`h-full rounded-full ${className}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="tabular w-20 shrink-0 text-right text-xs font-semibold text-plum-600">{value}</span>
    </div>
  );
}
