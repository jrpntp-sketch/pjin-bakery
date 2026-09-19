"use client";

import { useState } from "react";
import { toNum } from "@/lib/calc";
import { db, newId, now, removeProduct } from "@/lib/db";
import { useStock } from "@/lib/hooks";
import { money, num, thaiDate } from "@/lib/format";
import type { Product } from "@/lib/types";
import {
  Badge, Button, Card, Empty, Field, inputClass, numberInput, PageHeader,
} from "@/components/ui";

export default function ProductsPage() {
  const stock = useStock();
  const [editing, setEditing] = useState<Product | null>(null);

  if (!stock) return <div className="h-40 animate-pulse rounded-2xl bg-cream-100" />;

  return (
    <>
      <PageHeader
        title="สินค้า"
        subtitle="กำหนดราคาขายมาตรฐานสำหรับใช้เป็นค่าเริ่มต้น"
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Card title={`รายการสินค้า (${stock.length})`}>
          {stock.length === 0 ? (
            <Empty>ยังไม่มีรายการสินค้า — กรุณาเพิ่มสินค้าใหม่</Empty>
          ) : (
            <ul className="divide-y divide-cream-100">
              {stock.map((s) => {
                const p = s.product;
                const margin = p.basePrice > 0
                  ? ((p.basePrice - s.avgCostPerUnit) / p.basePrice) * 100 : 0;
                return (
                  <li key={p.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-semibold text-plum-700">
                          {p.name}
                          {!p.isActive && <Badge>ปิดใช้งาน</Badge>}
                          {p.isActive && s.stockQty <= p.lowStockThreshold && (
                            <Badge tone={s.stockQty <= 0 ? "bad" : "warn"}>
                              เหลือ {num(s.stockQty)}
                            </Badge>
                          )}
                        </p>
                        <p className="tabular mt-1 text-xs text-plum-400">
                          ขาย {money(p.basePrice)}/{p.unit} · ต้นทุนจริง{" "}
                          {s.avgCostPerUnit > 0 ? money(s.avgCostPerUnit) : "— ยังไม่มีรอบผลิต"}
                          {s.avgCostPerUnit > 0 && (
                            <> · <span className={margin < 20 ? "font-semibold text-berry-500" : "font-semibold text-leaf-500"}>
                              อัตรากำไร {margin.toFixed(0)}%
                            </span></>
                          )}
                        </p>
                        <p className="text-xs text-plum-400">
                          สต็อก {num(s.stockQty)} {p.unit} · ผลิตล่าสุด {thaiDate(s.lastProducedOn)}
                        </p>
                        {p.notes && <p className="mt-1 text-xs text-plum-400">{p.notes}</p>}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button type="button" onClick={() => setEditing(p)}
                          className="rounded-lg px-2 py-1 text-xs font-semibold text-plum-400 transition hover:bg-cream-100 hover:text-plum-600">
                          แก้ไข
                        </button>
                        <button type="button"
                          onClick={async () => {
                            const r = await removeProduct(p.id);
                            if (r === "archived") {
                              alert('ไม่สามารถลบได้เนื่องจากมีประวัติการทำรายการ ระบบจะปรับสถานะเป็น "ปิดการใช้งาน" เพื่อรักษาความถูกต้องของรายงาน');
                            }
                          }}
                          className="rounded-lg px-2 py-1 text-xs font-semibold text-plum-400 transition hover:bg-berry-500/10 hover:text-berry-500">
                          ลบ
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="lg:sticky lg:top-5 lg:self-start">
          <ProductForm key="new" />
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-plum-700/30 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setEditing(null)}>
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <ProductForm product={editing} onDone={() => setEditing(null)} />
          </div>
        </div>
      )}
    </>
  );
}

function ProductForm({ product, onDone }: { product?: Product; onDone?: () => void }) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // ต้องเก็บ form ไว้ก่อน await เพราะ React เคลียร์ e.currentTarget
    // ให้เป็น null หลังจบรอบ event ถ้าไปเรียกทีหลังจะพัง
    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = String(fd.get("name") ?? "").trim();
    if (!name) return setError("กรุณาใส่ชื่อสินค้า");

    const row = {
      name,
      unit: String(fd.get("unit") ?? "ชิ้น").trim() || "ชิ้น",
      basePrice: toNum(fd.get("basePrice")),
      lowStockThreshold: Math.max(0, Math.round(toNum(fd.get("lowStockThreshold")))),
      notes: String(fd.get("notes") ?? "").trim() || undefined,
      isActive: fd.get("isActive") !== null,
    };

    if (product) {
      await db.products.update(product.id, row);
      onDone?.();
    } else {
      await db.products.add({ ...row, id: newId(), createdAt: now() });
      form.reset();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setError("");
  }

  return (
    <Card title={product ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}>
      <form onSubmit={submit} className="space-y-3.5">
        <Field label="ชื่อสินค้า">
          <input name="name" required defaultValue={product?.name}
            placeholder="เช่น บราวนี่หน้ากรอบ" className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ราคาขาย/หน่วย">
            <input name="basePrice" {...numberInput}
              defaultValue={product?.basePrice ?? ""} placeholder="0.00" className={inputClass} />
          </Field>
          <Field label="หน่วย">
            <input name="unit" defaultValue={product?.unit ?? "ชิ้น"}
              placeholder="ชิ้น / กล่อง" className={inputClass} />
          </Field>
        </div>
        <Field label="เตือนเมื่อสต็อกเหลือน้อยกว่า" hint="ใช้แสดงในหน้าภาพรวม">
          <input name="lowStockThreshold" {...numberInput}
            defaultValue={product?.lowStockThreshold ?? 5} className={inputClass} />
        </Field>
        <Field label="โน้ต (ไม่บังคับ)">
          <textarea name="notes" rows={2} defaultValue={product?.notes ?? ""}
            placeholder="สูตร ข้อควรระวัง ฯลฯ" className={inputClass} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-plum-600">
          <input type="checkbox" name="isActive" defaultChecked={product?.isActive ?? true}
            className="size-4 rounded border-cream-200 accent-plum-600" />
          ยังขายอยู่
        </label>

        {error && <p className="rounded-xl bg-berry-500/10 px-3 py-2 text-sm text-berry-500">{error}</p>}
        {saved && <p className="rounded-xl bg-leaf-500/10 px-3 py-2 text-sm text-leaf-500">บันทึกแล้ว ✓</p>}

        <div className="flex gap-2">
          <Button type="submit" className="flex-1">
            {product ? "บันทึกการแก้ไข" : "เพิ่มสินค้า"}
          </Button>
          {product && <Button type="button" variant="ghost" onClick={onDone}>ยกเลิก</Button>}
        </div>
      </form>
    </Card>
  );
}
