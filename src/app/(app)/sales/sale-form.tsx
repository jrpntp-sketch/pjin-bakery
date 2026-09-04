"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { saveSale } from "@/lib/actions/sales";
import type { FormState } from "@/lib/actions/products";
import type { Channel, ProductStock } from "@/lib/types";
import { money, num } from "@/lib/format";
import { unitPriceFor, channelShareFor } from "@/lib/pricing";
import { Badge, Button, Card, Field, inputClass } from "@/components/ui";

const EMPTY: FormState = {};

export function SaleForm({
  stock,
  channels,
  today,
}: {
  stock: ProductStock[];
  channels: Channel[];
  today: string;
}) {
  const [state, formAction, pending] = useActionState(saveSale, EMPTY);
  const formRef = useRef<HTMLFormElement>(null);

  const [productId, setProductId] = useState(stock[0]?.product_id ?? "");
  const [channelId, setChannelId] = useState(channels[0]?.id ?? "");
  const [qty, setQty] = useState("1");
  const [priceOverride, setPriceOverride] = useState<string | null>(null);
  const [delivery, setDelivery] = useState("");

  const product = stock.find((s) => s.product_id === productId);
  const channel = channels.find((c) => c.id === channelId);

  // ราคาตั้งต้นเปลี่ยนตามช่องทาง/สินค้า ตราบใดที่ผู้ใช้ยังไม่ได้พิมพ์ทับ
  const defaultPrice =
    channel && product ? unitPriceFor(channel, Number(product.base_price)) : 0;
  const price = priceOverride !== null ? Number(priceOverride) || 0 : defaultPrice;

  // ค่าส่งตั้งต้นมาจากช่องทาง
  useEffect(() => {
    setDelivery(
      channel && Number(channel.shipping_cost_per_trip) > 0
        ? String(channel.shipping_cost_per_trip)
        : "",
    );
  }, [channel]);

  useEffect(() => {
    if (state.ok) {
      setQty("1");
      setPriceOverride(null);
    }
  }, [state]);

  const calc = useMemo(() => {
    const q = Number(qty) || 0;
    const revenue = price * q;
    const share = channel ? channelShareFor(channel, price, q) : 0;
    const deliveryCost = Number(delivery) || 0;
    const fullCost = Number(product?.avg_cost_per_unit ?? 0) * q;
    const materialCost = Number(product?.avg_material_cost_per_unit ?? 0) * q;
    const net = revenue - fullCost - share - deliveryCost;
    return {
      revenue,
      share,
      gross: revenue - materialCost,
      net,
      stockLeft: Number(product?.stock_qty ?? 0) - q,
      notEnough: q > Number(product?.stock_qty ?? 0),
      noCost: Number(product?.avg_cost_per_unit ?? 0) === 0,
    };
  }, [qty, price, channel, delivery, product]);

  return (
    <Card title="บันทึกรายการขาย">
      <form ref={formRef} action={formAction} className="space-y-3.5">
        <Field label="สินค้า">
          <select
            name="product_id"
            required
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className={inputClass}
          >
            {stock.map((s) => (
              <option key={s.product_id} value={s.product_id}>
                {s.name} (เหลือ {num(s.stock_qty)})
              </option>
            ))}
          </select>
        </Field>

        <Field label="ช่องทางขาย">
          <select
            name="channel_id"
            required
            value={channelId}
            onChange={(e) => {
              setChannelId(e.target.value);
              setPriceOverride(null);
            }}
            className={inputClass}
          >
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.share_type === "percent" && ` (หัก ${c.share_percent}%)`}
                {c.share_type === "fixed" && ` (${money(c.fixed_price)})`}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={`จำนวน (${product?.unit ?? "ชิ้น"})`}>
            <input
              name="qty"
              type="number"
              step="0.01"
              min="0.01"
              required
              inputMode="decimal"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="ราคา/หน่วย">
            <input
              name="unit_price"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={priceOverride ?? String(defaultPrice)}
              onChange={(e) => setPriceOverride(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="วันที่ขาย">
            <input
              name="sold_on"
              type="date"
              defaultValue={today}
              className={inputClass}
            />
          </Field>
          <Field label="ค่าส่งรอบนี้">
            <input
              name="delivery_cost"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={delivery}
              onChange={(e) => setDelivery(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="โน้ต (ไม่บังคับ)">
          <input
            name="notes"
            placeholder="เช่น ลูกค้าประจำ, งานอีเวนต์"
            className={inputClass}
          />
        </Field>

        {/* สรุปกำไรสด ๆ */}
        <div className="space-y-1.5 rounded-xl bg-cream-50 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-cocoa-600">ยอดขาย</span>
            <span className="tabular font-semibold text-cocoa-700">
              {money(calc.revenue)}
            </span>
          </div>
          {calc.share > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-cocoa-400">หักส่วนแบ่งช่องทาง</span>
              <span className="tabular text-cocoa-400">−{money(calc.share)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-cocoa-600">กำไรขั้นต้น</span>
            <span className="tabular text-cocoa-700">{money(calc.gross)}</span>
          </div>
          <div className="flex justify-between border-t border-cream-200 pt-1.5">
            <span className="font-semibold text-cocoa-600">กำไรสุทธิ</span>
            <span
              className={`tabular font-bold ${
                calc.net >= 0 ? "text-mint-500" : "text-berry-500"
              }`}
            >
              {money(calc.net)}
            </span>
          </div>
          {calc.noCost && (
            <p className="pt-1 text-xs text-amber-600">
              ⚠️ สินค้านี้ยังไม่มีรอบผลิต — กำไรสุทธิจะเท่ากับยอดขาย
            </p>
          )}
        </div>

        {calc.notEnough ? (
          <p className="rounded-xl bg-berry-500/10 px-3 py-2 text-sm text-berry-500">
            สต๊อกไม่พอ — เหลือ {num(product?.stock_qty ?? 0)} {product?.unit}
          </p>
        ) : (
          <p className="text-xs text-cocoa-400">
            ขายแล้วจะเหลือ{" "}
            <Badge tone={calc.stockLeft <= 0 ? "warn" : "neutral"}>
              {num(calc.stockLeft)} {product?.unit}
            </Badge>
          </p>
        )}

        {state.error && (
          <p className="rounded-xl bg-berry-500/10 px-3 py-2 text-sm text-berry-500">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p className="rounded-xl bg-mint-500/10 px-3 py-2 text-sm text-mint-500">
            บันทึกแล้ว ✓ ตัดสต๊อกเรียบร้อย
          </p>
        )}

        <Button
          type="submit"
          disabled={pending || calc.notEnough}
          className="w-full"
        >
          {pending ? "กำลังบันทึก…" : "บันทึกการขาย"}
        </Button>
      </form>
    </Card>
  );
}
