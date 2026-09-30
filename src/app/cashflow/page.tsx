"use client";

import { useState } from "react";
import { useCashflow } from "@/lib/hooks";
import { money, monthStartISO, num, thaiDate, todayISO } from "@/lib/format";
import { Card, Empty, inputClass, PageHeader, Stat } from "@/components/ui";

const PRESETS = [
  { label: "7 วัน", days: 7 },
  { label: "30 วัน", days: 30 },
  { label: "90 วัน", days: 90 },
] as const;

const iso = (d: Date) => d.toLocaleDateString("en-CA");

export default function CashflowPage() {
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(todayISO());
  const c = useCashflow(from, to);

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

  if (!c) return <div className="h-40 animate-pulse rounded-3xl bg-cream-100" />;

  return (
    <>
      <PageHeader
        title="รายรับ-รายจ่าย"
        subtitle="เงินเข้าออกจริงในช่วงเวลาที่เลือก"
      />

      <Card className="mb-4">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="min-w-0">
              <span className="mb-1.5 block text-xs font-semibold text-plum-600">ตั้งแต่</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
            </label>
            <label className="min-w-0">
              <span className="mb-1.5 block text-xs font-semibold text-plum-600">ถึง</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
            </label>
          </div>
          <div className="flex flex-wrap gap-1.5">
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

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="เงินเข้า" value={money(c.in.received)} tone="good"
          hint="ยอดขายหลังหักส่วนแบ่ง" />
        <Stat label="เงินออก" value={money(c.out.total)} tone="bad"
          hint="จ่ายออกไปจริง" />
        <Stat label="คงเหลือ" value={money(c.net)}
          tone={c.net > 0 ? "good" : c.net < 0 ? "bad" : "neutral"}
          hint="เงินเข้า − เงินออก" />
      </div>

      {c.count === 0 ? (
        <Card><Empty icon="🥧">ช่วงเวลานี้ยังไม่มีเงินเข้าออก</Empty></Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="เงินเข้า">
              <dl className="space-y-2 text-sm">
                <Row label="ยอดขายทั้งหมด" value={money(c.in.grossSales)} />
                {c.in.channelShare > 0 && (
                  <Row label="หักส่วนแบ่งช่องทาง" value={"−" + money(c.in.channelShare)} muted />
                )}
                <Total label="ได้รับจริง" value={money(c.in.received)} tone="good" />
              </dl>
            </Card>

            <Card title="เงินออก">
              <dl className="space-y-2 text-sm">
                <Row label="ค่าวัตถุดิบ" value={money(c.out.materials)} />
                <Row label="ค่าแฝง (ไฟ แก๊ส บรรจุภัณฑ์)" value={money(c.out.overhead)} />
                <Row label="ค่าส่ง" value={money(c.out.delivery)} />
                <Row label="รายจ่ายอื่น" value={money(c.out.other)} />
                <Total label="จ่ายออกจริง" value={money(c.out.total)} tone="bad" />
              </dl>
            </Card>
          </div>

          <Card title="💡 ทำไมตัวเลขไม่ตรงกับหน้ารายงาน" className="mt-4">
            <div className="space-y-2.5 text-sm leading-relaxed text-plum-600">
              <p>
                หน้านี้ดู <b className="text-plum-700">เงินสดจริง</b> ที่เข้าและออกจากกระเป๋า
                ส่วนหน้ารายงานดู <b className="text-plum-700">กำไร</b> ซึ่งรวมค่าแรงตัวเองเป็นต้นทุนด้วย
              </p>
              <div className="rounded-2xl bg-cream-100 p-3">
                <p className="text-xs font-semibold text-plum-600">
                  ค่าแรงตัวเองในช่วงนี้ ไม่ได้นับเป็นเงินออก
                </p>
                <p className="tabular mt-1 text-lg font-bold text-plum-700">
                  {money(c.ownLabor)}
                </p>
                <p className="text-xs text-plum-400">
                  จากการทำงาน {num(c.hours)} ชั่วโมง — ไม่ได้จ่ายให้ใคร จึงไม่ใช่เงินที่ออกจากร้าน
                </p>
              </div>
              <p className="text-xs text-plum-400">
                ถ้าคิดค่าแรงตัวเองด้วย จะเหลือ{" "}
                <b className={c.net - c.ownLabor >= 0 ? "text-leaf-500" : "text-berry-500"}>
                  {money(c.net - c.ownLabor)}
                </b>{" "}
                — ตัวเลขนี้คือคำตอบว่าคุ้มแรงไหม ดูละเอียดได้ที่หน้ารายงาน
              </p>
            </div>
          </Card>

          <Card title={`รายการเคลื่อนไหว (${c.count})`} className="mt-4">
            <ul className="divide-y divide-cream-100">
              {c.moves.map((m) => (
                <li key={m.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-plum-700">{m.label}</p>
                    <p className="truncate text-xs text-plum-400">
                      {thaiDate(m.date)}
                      {m.detail && ` · ${m.detail}`}
                    </p>
                  </div>
                  <p className={`tabular shrink-0 text-sm font-bold ${
                    m.kind === "in" ? "text-leaf-500" : "text-berry-500"}`}>
                    {m.kind === "in" ? "+" : "−"}{money(m.amount)}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={muted ? "text-plum-400" : "text-plum-600"}>{label}</dt>
      <dd className={`tabular shrink-0 ${muted ? "text-plum-400" : "text-plum-700"}`}>{value}</dd>
    </div>
  );
}

function Total({ label, value, tone }: { label: string; value: string; tone: "good" | "bad" }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-cream-200 pt-2">
      <dt className="font-semibold text-plum-700">{label}</dt>
      <dd className={`tabular shrink-0 font-bold ${tone === "good" ? "text-leaf-500" : "text-berry-500"}`}>
        {value}
      </dd>
    </div>
  );
}
