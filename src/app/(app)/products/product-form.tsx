"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveProduct, deleteProduct } from "@/lib/actions/products";
import type { FormState } from "@/lib/actions/products";
import type { Product } from "@/lib/types";
import { Button, Card, Field, inputClass } from "@/components/ui";

const EMPTY: FormState = {};

export function ProductForm({
  product,
  onDone,
}: {
  product?: Product;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveProduct, EMPTY);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      if (product) onDone?.();
      else formRef.current?.reset();
    }
  }, [state, product, onDone]);

  return (
    <Card title={product ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}>
      <form ref={formRef} action={formAction} className="space-y-3.5">
        {product && <input type="hidden" name="id" value={product.id} />}

        <Field label="ชื่อสินค้า">
          <input
            name="name"
            required
            defaultValue={product?.name}
            placeholder="เช่น บราวนี่หน้ากรอบ"
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="ราคาขาย/หน่วย">
            <input
              name="base_price"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              defaultValue={product?.base_price ?? ""}
              placeholder="0.00"
              className={inputClass}
            />
          </Field>
          <Field label="หน่วย">
            <input
              name="unit"
              defaultValue={product?.unit ?? "ชิ้น"}
              placeholder="ชิ้น / กล่อง"
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="เตือนเมื่อสต๊อกเหลือน้อยกว่า" hint="ใช้แสดงในหน้าภาพรวม">
          <input
            name="low_stock_threshold"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            defaultValue={product?.low_stock_threshold ?? 5}
            className={inputClass}
          />
        </Field>

        <Field label="โน้ต (ไม่บังคับ)">
          <textarea
            name="notes"
            rows={2}
            defaultValue={product?.notes ?? ""}
            placeholder="สูตร ข้อควรระวัง ฯลฯ"
            className={inputClass}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-cocoa-600">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={product?.is_active ?? true}
            className="size-4 rounded border-cream-200 accent-cocoa-600"
          />
          ยังขายอยู่
        </label>

        {state.error && (
          <p className="rounded-xl bg-berry-500/10 px-3 py-2 text-sm text-berry-500">
            {state.error}
          </p>
        )}
        {state.ok && !product && (
          <p className="rounded-xl bg-mint-500/10 px-3 py-2 text-sm text-mint-500">
            บันทึกแล้ว ✓
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={pending} className="flex-1">
            {pending ? "กำลังบันทึก…" : product ? "บันทึกการแก้ไข" : "เพิ่มสินค้า"}
          </Button>
          {product && (
            <Button type="button" variant="ghost" onClick={onDone}>
              ยกเลิก
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}

export function ProductRowActions({ product }: { product: Product }) {
  const [editing, setEditing] = useState(false);

  return (
    <>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-cocoa-400 transition hover:bg-cream-100 hover:text-cocoa-600"
        >
          แก้ไข
        </button>
        <form action={deleteProduct}>
          <input type="hidden" name="id" value={product.id} />
          <button
            type="submit"
            className="rounded-lg px-2 py-1 text-xs font-semibold text-cocoa-400 transition hover:bg-berry-500/10 hover:text-berry-500"
          >
            ลบ
          </button>
        </form>
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-cocoa-700/30 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setEditing(false)}
        >
          <div
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <ProductForm product={product} onDone={() => setEditing(false)} />
          </div>
        </div>
      )}
    </>
  );
}
