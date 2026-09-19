"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { db, newId, now } from "@/lib/db";
import { useProducts, useSettings } from "@/lib/hooks";
import { money, num, todayISO } from "@/lib/format";
import { round2 } from "@/lib/calc";
import { Button, Card, Empty, Field, inputClass, LinkButton, PageHeader } from "@/components/ui";

type Line = { key: number; name: string; cost: string };

export default function NewBatchPage() {
  const router = useRouter();
  const products = useProducts(true);
  const settings = useSettings();

  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [hours, setHours] = useState("");
  const [wage, setWage] = useState("");
  const [overhead, setOverhead] = useState("");
  const [materialTotal, setMaterialTotal] = useState("");
  const [detailed, setDetailed] = useState(false);
  const [lines, setLines] = useState<Line[]>([{ key: 0, name: "", cost: "" }]);
  const [producedOn, setProducedOn] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // ตั้งค่าเริ่มต้นเมื่อข้อมูลโหลดเสร็จ
  const pid = productId || products?.[0]?.id || "";
  const effectiveWage = wage !== "" ? wage : String(settings?.hourlyWage ?? 0);
  const product = products?.find((p) => p.id === pid);

  const calc = useMemo(() => {
    const q = Number(qty) || 0;
    const materials = detailed
      ? lines.reduce((s, l) => s + (Number(l.cost) || 0), 0)
      : Number(materialTotal) || 0;
    const labor = (Number(hours) || 0) * (Number(effectiveWage) || 0);
    const oh = Number(overhead) || 0;
    const total = materials + labor + oh;
    const perUnit = q > 0 ? total / q : 0;
    const materialPerUnit = q > 0 ? materials / q : 0;
    const price = product?.basePrice ?? 0;
    return {
      materials, labor, overhead: oh, total, perUnit, materialPerUnit,
      grossPerUnit: price - materialPerUnit,
      netPerUnit: price - perUnit,
      marginPct: price > 0 ? ((price - perUnit) / price) * 100 : 0,
      hasQty: q > 0, price,
    };
  }, [qty, hours, effectiveWage, overhead, materialTotal, detailed, lines, product]);

  if (!products || !settings) {
    return <div className="h-40 animate-pulse rounded-2xl bg-cream-100" />;
  }

  if (products.length === 0) {
    return (
      <>
        <PageHeader title="บันทึกรอบผลิต" />
        <Card>
          <Empty>
            ต้องมีสินค้าก่อนถึงจะบันทึกรอบผลิตได้
            <span className="mt-3 block"><LinkButton href="/products">ไปเพิ่มสินค้า</LinkButton></span>
          </Empty>
        </Card>
      </>
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!pid || Number(qty) <= 0) return;
    setSaving(true);

    const materials = detailed
      ? lines.filter((l) => l.name.trim() !== "" || Number(l.cost) > 0)
             .map((l) => ({ name: l.name.trim() || "วัตถุดิบ", cost: Number(l.cost) || 0 }))
      : undefined;

    await db.batches.add({
      id: newId(),
      productId: pid,
      producedOn,
      qtyProduced: Number(qty),
      hoursSpent: Number(hours) || 0,
      hourlyWageSnapshot: Number(effectiveWage) || 0,
      materialCost: round2(calc.materials),
      overheadCost: Number(overhead) || 0,
      materials: materials?.length ? materials : undefined,
      notes: notes.trim() || undefined,
      createdAt: now(),
    });
    router.push("/batches");
  }

  const addLine = () => setLines((l) => [...l, { key: Date.now(), name: "", cost: "" }]);
  const removeLine = (key: number) => setLines((l) => (l.length > 1 ? l.filter((x) => x.key !== key) : l));
  const updateLine = (key: number, patch: Partial<Line>) =>
    setLines((l) => l.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  return (
    <>
      <PageHeader title="บันทึกรอบผลิต"
        subtitle="กรอกวัตถุดิบ เวลา และจำนวนที่ได้ — ระบบคิดต้นทุนจริงต่อชิ้นให้ทันที"
        action={<LinkButton href="/batches" variant="ghost">ดูรอบผลิตทั้งหมด</LinkButton>} />

      <form onSubmit={save} className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <Card title="รอบผลิตนี้">
            <div className="space-y-3.5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="สินค้า">
                  <select value={pid} onChange={(e) => setProductId(e.target.value)} className={inputClass}>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Field>
                <Field label="วันที่ผลิต">
                  <input type="date" value={producedOn} onChange={(e) => setProducedOn(e.target.value)} className={inputClass} />
                </Field>
              </div>
              <Field label={`จำนวนที่ได้ (${product?.unit ?? "ชิ้น"})`}
                hint="ตัวเลขนี้คือตัวหารของต้นทุนต่อชิ้น — ใส่ให้ตรงกับที่ได้จริง">
                <input type="number" step="0.01" min="0.01" required inputMode="decimal"
                  value={qty} onChange={(e) => setQty(e.target.value)}
                  placeholder="เช่น 24" className={inputClass} />
              </Field>
            </div>
          </Card>

          <Card title="ต้นทุนวัตถุดิบ"
            action={
              <button type="button" onClick={() => setDetailed((d) => !d)}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-cocoa-400 transition hover:bg-cream-100 hover:text-cocoa-600">
                {detailed ? "← กรอกยอดรวม" : "แยกรายการ →"}
              </button>
            }>
            {!detailed ? (
              <Field label="ยอดรวมวัตถุดิบของรอบนี้">
                <input type="number" step="0.01" min="0" inputMode="decimal"
                  value={materialTotal} onChange={(e) => setMaterialTotal(e.target.value)}
                  placeholder="0.00" className={inputClass} />
              </Field>
            ) : (
              <div className="space-y-2">
                {lines.map((l) => (
                  <div key={l.key} className="flex gap-2">
                    <input value={l.name} onChange={(e) => updateLine(l.key, { name: e.target.value })}
                      placeholder="เช่น แป้ง, เนย" className={`${inputClass} flex-1`} />
                    <input type="number" step="0.01" min="0" inputMode="decimal"
                      value={l.cost} onChange={(e) => updateLine(l.key, { cost: e.target.value })}
                      placeholder="0.00" className={`${inputClass} w-28`} />
                    <button type="button" onClick={() => removeLine(l.key)} aria-label="ลบรายการ"
                      className="shrink-0 rounded-xl px-2.5 text-cocoa-400 transition hover:bg-berry-500/10 hover:text-berry-500">
                      ✕
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addLine}
                  className="text-sm font-semibold text-cocoa-500 transition hover:text-cocoa-700">
                  + เพิ่มวัตถุดิบ
                </button>
                <p className="tabular pt-1 text-sm text-cocoa-400">รวม {money(calc.materials)}</p>
              </div>
            )}
          </Card>

          <Card title="ค่าแรง และ ค่าแฝง">
            <div className="space-y-3.5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="เวลาที่ใช้ทำ (ชั่วโมง)" hint="รวมเวลาส่งของด้วยได้">
                  <input type="number" step="0.25" min="0" inputMode="decimal"
                    value={hours} onChange={(e) => setHours(e.target.value)}
                    placeholder="เช่น 3.5" className={inputClass} />
                </Field>
                <Field label="ค่าแรง/ชั่วโมง"
                  hint={settings.hourlyWage > 0
                    ? `ค่าตั้งต้นจากหน้าตั้งค่า (${money(settings.hourlyWage)})`
                    : "ยังไม่ได้ตั้งค่าแรง — ตั้งได้ที่หน้าตั้งค่า"}>
                  <input type="number" step="0.01" min="0" inputMode="decimal"
                    value={effectiveWage} onChange={(e) => setWage(e.target.value)} className={inputClass} />
                </Field>
              </div>
              <Field label="ค่าแฝงของรอบนี้" hint="ไฟ แก๊ส บรรจุภัณฑ์ ค่าน้ำมัน ฯลฯ">
                <input type="number" step="0.01" min="0" inputMode="decimal"
                  value={overhead} onChange={(e) => setOverhead(e.target.value)}
                  placeholder="0.00" className={inputClass} />
              </Field>
              <Field label="โน้ต (ไม่บังคับ)">
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="เช่น ลองสูตรใหม่ ลดน้ำตาล" className={inputClass} />
              </Field>
            </div>
          </Card>
        </div>

        <div className="lg:sticky lg:top-5 lg:self-start">
          <Card title="💡 ต้นทุนจริงต่อหน่วย">
            {!calc.hasQty ? (
              <p className="py-6 text-center text-sm text-cocoa-400">ใส่จำนวนที่ได้ แล้วตัวเลขจะขึ้นตรงนี้</p>
            ) : (
              <>
                <p className="tabular text-3xl font-bold text-cocoa-700">{money(calc.perUnit)}</p>
                <p className="text-xs text-cocoa-400">ต่อ 1 {product?.unit ?? "ชิ้น"}</p>

                <dl className="mt-4 space-y-1.5 border-t border-cream-100 pt-3 text-sm">
                  <Row label="วัตถุดิบ" value={money(calc.materials)} />
                  <Row label="ค่าแรง" value={money(calc.labor)}
                    hint={`${num(Number(hours) || 0)} ชม. × ${money(Number(effectiveWage) || 0)}`} />
                  <Row label="ค่าแฝง" value={money(calc.overhead)} />
                  <div className="flex justify-between border-t border-cream-100 pt-1.5 font-semibold text-cocoa-700">
                    <dt>รวมทั้งรอบ</dt>
                    <dd className="tabular">{money(calc.total)}</dd>
                  </div>
                </dl>

                {calc.price > 0 && (
                  <div className="mt-4 space-y-2 rounded-xl bg-cream-50 p-3">
                    <p className="text-xs font-semibold text-cocoa-400">
                      ถ้าขายที่ {money(calc.price)}/{product?.unit}
                    </p>
                    <div className="flex justify-between text-sm">
                      <span className="text-cocoa-600">กำไรขั้นต้น</span>
                      <span className="tabular font-semibold text-cocoa-700">{money(calc.grossPerUnit)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-cocoa-600">กำไรสุทธิ</span>
                      <span className={`tabular font-bold ${calc.netPerUnit >= 0 ? "text-mint-500" : "text-berry-500"}`}>
                        {money(calc.netPerUnit)}
                      </span>
                    </div>
                    <p className={`text-xs font-medium ${
                      calc.netPerUnit < 0 ? "text-berry-500" : calc.marginPct < 20 ? "text-amber-600" : "text-mint-500"}`}>
                      {calc.netPerUnit < 0
                        ? "⚠️ ขายราคานี้แล้วขาดทุน — ขึ้นราคาหรือลดเวลา/ต้นทุน"
                        : calc.marginPct < 20
                          ? `มาร์จิ้น ${calc.marginPct.toFixed(0)}% — ค่อนข้างบาง`
                          : `มาร์จิ้น ${calc.marginPct.toFixed(0)}% — โอเคเลย`}
                    </p>
                  </div>
                )}
              </>
            )}

            <Button type="submit" disabled={saving || !calc.hasQty} className="mt-4 w-full">
              {saving ? "กำลังบันทึก…" : "บันทึกรอบผลิต + เข้าสต๊อก"}
            </Button>
            <p className="mt-2 text-center text-xs text-cocoa-400">บันทึกแล้วจะตัดเข้าสต๊อกให้อัตโนมัติ</p>
          </Card>
        </div>
      </form>
    </>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-cocoa-600">
        {label}
        {hint && <span className="ml-1.5 text-xs text-cocoa-400">{hint}</span>}
      </dt>
      <dd className="tabular shrink-0 text-cocoa-700">{value}</dd>
    </div>
  );
}
