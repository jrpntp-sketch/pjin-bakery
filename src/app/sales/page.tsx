"use client";

import { useEffect, useMemo, useState } from "react";
import { db, newId, now } from "@/lib/db";
import { useChannels, useSales, useStock } from "@/lib/hooks";
import { money, num, thaiDate, todayISO } from "@/lib/format";
import { channelShareFor, round4, toNum, unitPriceFor } from "@/lib/calc";
import { Badge, Button, Card, Empty, Field, inputClass, numberInput, LinkButton, PageHeader } from "@/components/ui";

export default function SalesPage() {
  const stock = useStock(true);
  const channels = useChannels(true);
  const sales = useSales();

  if (!stock || !channels || !sales) {
    return <div className="h-40 animate-pulse rounded-2xl bg-cream-100" />;
  }

  const missing: { label: string; href: string } | null =
    stock.length === 0 ? { label: "สินค้า", href: "/products" }
    : channels.length === 0 ? { label: "ช่องทางขาย", href: "/channels" }
    : null;

  return (
    <>
      <PageHeader title="บันทึกขาย / ฝากขาย"
        subtitle="เลือกสินค้ากับช่องทาง ระบบตัดสต็อกและคิดกำไรให้อัตโนมัติ" />

      {missing ? (
        <Card>
          <Empty>
            ต้องมี{missing.label}ก่อนถึงจะบันทึกขายได้
            <span className="mt-3 block">
              <LinkButton href={missing.href}>ไปเพิ่ม{missing.label}</LinkButton>
            </span>
          </Empty>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
          <div className="lg:sticky lg:top-5 lg:self-start">
            <SaleForm stock={stock} channels={channels} />
          </div>

          <Card title="รายการล่าสุด">
            {sales.length === 0 ? (
              <Empty icon="🧾">ยังไม่มีรายการขาย</Empty>
            ) : (
              <ul className="divide-y divide-cream-100">
                {sales.map((t) => (
                  <li key={t.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-plum-700">
                          {t.productName} <span className="font-normal text-plum-400">× {num(t.qty)}</span>
                        </p>
                        <p className="text-xs text-plum-400">
                          {t.channelName} · {thaiDate(t.soldOn)} · {money(t.unitPrice)}/{t.productUnit}
                        </p>
                        <p className="tabular mt-1 text-xs text-plum-400">
                          ต้นทุน {money(t.unitFullCost * t.qty)}
                          {t.channelShare > 0 && ` · ส่วนแบ่ง ${money(t.channelShare)}`}
                          {t.deliveryCost > 0 && ` · ค่าส่ง ${money(t.deliveryCost)}`}
                        </p>
                        {t.notes && <p className="mt-1 text-xs text-plum-400">{t.notes}</p>}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="tabular font-semibold text-plum-700">{money(t.revenue)}</p>
                        <p className="tabular text-xs text-plum-400">ขั้นต้น {money(t.grossProfit)}</p>
                        <p className={`tabular text-xs font-bold ${t.netProfit >= 0 ? "text-leaf-500" : "text-berry-500"}`}>
                          สุทธิ {money(t.netProfit)}
                        </p>
                        <button type="button"
                          onClick={async () => {
                            if (confirm("ลบรายการขายนี้? สต็อกจะถูกคืนกลับ")) {
                              await db.transactions.delete(t.id);
                            }
                          }}
                          className="mt-1 rounded-lg px-2 py-1 text-xs font-semibold text-plum-400 transition hover:bg-berry-500/10 hover:text-berry-500">
                          ลบ
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

function SaleForm({ stock, channels }: {
  stock: NonNullable<ReturnType<typeof useStock>>;
  channels: NonNullable<ReturnType<typeof useChannels>>;
}) {
  const [productId, setProductId] = useState(stock[0]?.product.id ?? "");
  const [channelId, setChannelId] = useState(channels[0]?.id ?? "");
  const [qty, setQty] = useState("1");
  const [priceOverride, setPriceOverride] = useState<string | null>(null);
  const [delivery, setDelivery] = useState("");
  const [soldOn, setSoldOn] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);

  const item = stock.find((s) => s.product.id === productId) ?? stock[0];
  const channel = channels.find((c) => c.id === channelId) ?? channels[0];

  const defaultPrice = channel && item ? unitPriceFor(channel, item.product.basePrice) : 0;
  const price = priceOverride !== null ? toNum(priceOverride) : defaultPrice;

  // ค่าส่งตั้งต้นมาจากช่องทางที่เลือก
  useEffect(() => {
    setDelivery(channel && channel.shippingCostPerTrip > 0 ? String(channel.shippingCostPerTrip) : "");
  }, [channel]);

  const calc = useMemo(() => {
    const q = toNum(qty);
    const revenue = price * q;
    const share = channel ? channelShareFor(channel, price, q) : 0;
    const deliveryCost = toNum(delivery);
    const net = revenue - (item?.avgCostPerUnit ?? 0) * q - share - deliveryCost;
    return {
      revenue, share,
      gross: revenue - (item?.avgMaterialCostPerUnit ?? 0) * q,
      net,
      stockLeft: (item?.stockQty ?? 0) - q,
      notEnough: q > (item?.stockQty ?? 0),
      noCost: (item?.avgCostPerUnit ?? 0) === 0,
    };
  }, [qty, price, channel, delivery, item]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const qtyNum = toNum(qty);
    if (!item || !channel || calc.notEnough || !(qtyNum > 0)) return;

    await db.transactions.add({
      id: newId(),
      productId: item.product.id,
      channelId: channel.id,
      soldOn,
      qty: qtyNum,
      unitPrice: price,
      deliveryCost: toNum(delivery),
      unitFullCost: round4(item.avgCostPerUnit),
      unitMaterialCost: round4(item.avgMaterialCostPerUnit),
      channelShare: calc.share,
      notes: notes.trim() || undefined,
      createdAt: now(),
    });

    setQty("1");
    setPriceOverride(null);
    setNotes("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <Card title="บันทึกรายการขาย">
      <form onSubmit={save} className="space-y-3.5">
        <Field label="สินค้า">
          <select value={productId} onChange={(e) => setProductId(e.target.value)} className={inputClass}>
            {stock.map((s) => (
              <option key={s.product.id} value={s.product.id}>
                {s.product.name} (เหลือ {num(s.stockQty)})
              </option>
            ))}
          </select>
        </Field>

        <Field label="ช่องทางขาย">
          <select value={channelId}
            onChange={(e) => { setChannelId(e.target.value); setPriceOverride(null); }}
            className={inputClass}>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.shareType === "percent" && ` (หัก ${c.sharePercent}%)`}
                {c.shareType === "fixed" && ` (${money(c.fixedPrice)})`}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={`จำนวน (${item?.product.unit ?? "ชิ้น"})`}>
            <input {...numberInput} required
              value={qty} onChange={(e) => setQty(e.target.value)} className={inputClass} />
          </Field>
          <Field label="ราคา/หน่วย">
            <input {...numberInput}
              value={priceOverride ?? String(defaultPrice)}
              onChange={(e) => setPriceOverride(e.target.value)} className={inputClass} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="วันที่ขาย">
            <input type="date" value={soldOn} onChange={(e) => setSoldOn(e.target.value)} className={inputClass} />
          </Field>
          <Field label="ค่าส่งรอบนี้">
            <input {...numberInput}
              value={delivery} onChange={(e) => setDelivery(e.target.value)}
              placeholder="0.00" className={inputClass} />
          </Field>
        </div>

        <Field label="โน้ต (ไม่บังคับ)">
          <input value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="เช่น ลูกค้าประจำ, งานอีเวนต์" className={inputClass} />
        </Field>

        <div className="space-y-1.5 rounded-xl bg-cream-50 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-plum-600">ยอดขาย</span>
            <span className="tabular font-semibold text-plum-700">{money(calc.revenue)}</span>
          </div>
          {calc.share > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-plum-400">หักส่วนแบ่งช่องทาง</span>
              <span className="tabular text-plum-400">−{money(calc.share)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-plum-600">กำไรขั้นต้น</span>
            <span className="tabular text-plum-700">{money(calc.gross)}</span>
          </div>
          <div className="flex justify-between border-t border-cream-200 pt-1.5">
            <span className="font-semibold text-plum-600">กำไรสุทธิ</span>
            <span className={`tabular font-bold ${calc.net >= 0 ? "text-leaf-500" : "text-berry-500"}`}>
              {money(calc.net)}
            </span>
          </div>
          {calc.noCost && (
            <p className="pt-1 text-xs text-peach-600">
              ⚠️ สินค้านี้ยังไม่มีรอบผลิต — กำไรสุทธิจะเท่ากับยอดขาย
            </p>
          )}
        </div>

        {calc.notEnough ? (
          <p className="rounded-xl bg-berry-500/10 px-3 py-2 text-sm text-berry-500">
            สต็อกไม่พอ — เหลือ {num(item?.stockQty ?? 0)} {item?.product.unit}
          </p>
        ) : (
          <p className="text-xs text-plum-400">
            ขายแล้วจะเหลือ{" "}
            <Badge tone={calc.stockLeft <= 0 ? "warn" : "neutral"}>
              {num(calc.stockLeft)} {item?.product.unit}
            </Badge>
          </p>
        )}

        {saved && (
          <p className="rounded-xl bg-leaf-500/10 px-3 py-2 text-sm text-leaf-500">
            บันทึกแล้ว ✓ ตัดสต็อกเรียบร้อย
          </p>
        )}

        <Button type="submit" disabled={calc.notEnough} className="w-full">บันทึกการขาย</Button>
      </form>
    </Card>
  );
}
