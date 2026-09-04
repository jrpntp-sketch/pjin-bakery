"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveChannel, deleteChannel } from "@/lib/actions/channels";
import type { FormState } from "@/lib/actions/products";
import type { Channel, ShareType } from "@/lib/types";
import { Button, Card, Field, inputClass } from "@/components/ui";

const EMPTY: FormState = {};

const OPTIONS: { value: ShareType; label: string; hint: string }[] = [
  { value: "none", label: "ขายเอง", hint: "ได้เต็มราคามาตรฐานของสินค้า" },
  { value: "percent", label: "หัก %", hint: "ร้านที่ฝากขายหักเป็นเปอร์เซ็นต์" },
  { value: "fixed", label: "ราคาคงที่", hint: "ส่งให้ในราคาต่อหน่วยที่ตกลงกัน" },
];

export function ChannelForm({
  channel,
  onDone,
}: {
  channel?: Channel;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveChannel, EMPTY);
  const formRef = useRef<HTMLFormElement>(null);
  const [shareType, setShareType] = useState<ShareType>(
    channel?.share_type ?? "none",
  );

  useEffect(() => {
    if (state.ok) {
      if (channel) onDone?.();
      else {
        formRef.current?.reset();
        setShareType("none");
      }
    }
  }, [state, channel, onDone]);

  const active = OPTIONS.find((o) => o.value === shareType);

  return (
    <Card title={channel ? "แก้ไขช่องทาง" : "เพิ่มช่องทางขาย"}>
      <form ref={formRef} action={formAction} className="space-y-3.5">
        {channel && <input type="hidden" name="id" value={channel.id} />}

        <Field label="ชื่อช่องทาง">
          <input
            name="name"
            required
            defaultValue={channel?.name}
            placeholder="เช่น ฝากร้านกาแฟบ้านสวน"
            className={inputClass}
          />
        </Field>

        <Field label="รูปแบบส่วนแบ่ง" hint={active?.hint}>
          <input type="hidden" name="share_type" value={shareType} />
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-cream-100 p-1">
            {OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setShareType(o.value)}
                className={`rounded-lg py-2 text-xs font-semibold transition ${
                  shareType === o.value
                    ? "bg-white text-cocoa-700 shadow-sm"
                    : "text-cocoa-400 hover:text-cocoa-600"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </Field>

        {shareType === "percent" && (
          <Field label="ส่วนแบ่งที่ร้านหัก (%)">
            <input
              name="share_percent"
              type="number"
              step="0.5"
              min="0"
              max="100"
              inputMode="decimal"
              defaultValue={channel?.share_percent || ""}
              placeholder="เช่น 30"
              className={inputClass}
            />
          </Field>
        )}

        {shareType === "fixed" && (
          <Field
            label="ราคาส่งต่อหน่วย"
            hint="ราคานี้จะถูกใช้แทนราคามาตรฐานของสินค้า"
          >
            <input
              name="fixed_price"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              defaultValue={channel?.fixed_price || ""}
              placeholder="0.00"
              className={inputClass}
            />
          </Field>
        )}

        <Field
          label="ค่าขนส่ง/น้ำมัน ต่อรอบส่ง"
          hint="ใช้เป็นค่าตั้งต้นตอนบันทึกขาย แก้รายครั้งได้"
        >
          <input
            name="shipping_cost_per_trip"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            defaultValue={channel?.shipping_cost_per_trip || ""}
            placeholder="0.00"
            className={inputClass}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-cocoa-600">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={channel?.is_active ?? true}
            className="size-4 rounded border-cream-200 accent-cocoa-600"
          />
          ยังใช้ช่องทางนี้อยู่
        </label>

        {state.error && (
          <p className="rounded-xl bg-berry-500/10 px-3 py-2 text-sm text-berry-500">
            {state.error}
          </p>
        )}
        {state.ok && !channel && (
          <p className="rounded-xl bg-mint-500/10 px-3 py-2 text-sm text-mint-500">
            บันทึกแล้ว ✓
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={pending} className="flex-1">
            {pending ? "กำลังบันทึก…" : channel ? "บันทึกการแก้ไข" : "เพิ่มช่องทาง"}
          </Button>
          {channel && (
            <Button type="button" variant="ghost" onClick={onDone}>
              ยกเลิก
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}

export function ChannelRowActions({ channel }: { channel: Channel }) {
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
        <form action={deleteChannel}>
          <input type="hidden" name="id" value={channel.id} />
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
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <ChannelForm channel={channel} onDone={() => setEditing(false)} />
          </div>
        </div>
      )}
    </>
  );
}
