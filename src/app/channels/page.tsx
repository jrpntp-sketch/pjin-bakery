"use client";

import { useState } from "react";
import { toNum } from "@/lib/calc";
import { db, newId, now, removeChannel } from "@/lib/db";
import { useChannels } from "@/lib/hooks";
import { money } from "@/lib/format";
import type { Channel, ShareType } from "@/lib/types";
import {
  Badge, Button, Card, Empty, Field, inputClass, numberInput, PageHeader,
} from "@/components/ui";

const SHARE_LABEL = { none: "ได้เต็มราคา", percent: "หักส่วนแบ่ง %", fixed: "ราคาคงที่" } as const;

export default function ChannelsPage() {
  const channels = useChannels();
  const [editing, setEditing] = useState<Channel | null>(null);

  if (!channels) return <div className="h-40 animate-pulse rounded-2xl bg-cream-100" />;

  return (
    <>
      <PageHeader title="ช่องทางขาย"
        subtitle="ขายเอง ฝากร้าน หรือออกบูธ — แต่ละที่หักส่วนแบ่งไม่เท่ากัน" />

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Card title={`ช่องทางทั้งหมด (${channels.length})`}>
          {channels.length === 0 ? (
            <Empty icon="🏪">ยังไม่มีช่องทาง — เพิ่มทางขวาได้เลย</Empty>
          ) : (
            <ul className="divide-y divide-cream-100">
              {channels.map((c) => (
                <li key={c.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-semibold text-plum-700">
                        {c.name}
                        {!c.isActive && <Badge>ปิดใช้งาน</Badge>}
                      </p>
                      <p className="tabular mt-1 text-xs text-plum-400">
                        {SHARE_LABEL[c.shareType]}
                        {c.shareType === "percent" && ` · หัก ${c.sharePercent}% ของยอดขาย`}
                        {c.shareType === "fixed" && ` · ${money(c.fixedPrice)} ต่อหน่วย`}
                        {c.shippingCostPerTrip > 0 && ` · ค่าส่ง ${money(c.shippingCostPerTrip)}/รอบ`}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => setEditing(c)}
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-plum-400 transition hover:bg-cream-100 hover:text-plum-600">
                        แก้ไข
                      </button>
                      <button type="button"
                        onClick={async () => {
                          const r = await removeChannel(c.id);
                          if (r === "archived") alert("ช่องทางนี้มีประวัติขายอยู่ จึงเปลี่ยนเป็นปิดการใช้งานแทน");
                        }}
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-plum-400 transition hover:bg-berry-500/10 hover:text-berry-500">
                        ลบ
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="lg:sticky lg:top-5 lg:self-start">
          <ChannelForm key="new" />
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-plum-700/30 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setEditing(null)}>
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <ChannelForm channel={editing} onDone={() => setEditing(null)} />
          </div>
        </div>
      )}
    </>
  );
}

const OPTIONS: { value: ShareType; label: string; hint: string }[] = [
  { value: "none", label: "ขายเอง", hint: "ได้เต็มราคามาตรฐานของสินค้า" },
  { value: "percent", label: "หัก %", hint: "ร้านที่ฝากขายหักเป็นเปอร์เซ็นต์" },
  { value: "fixed", label: "ราคาคงที่", hint: "ส่งให้ในราคาต่อหน่วยที่ตกลงกัน" },
];

function ChannelForm({ channel, onDone }: { channel?: Channel; onDone?: () => void }) {
  const [shareType, setShareType] = useState<ShareType>(channel?.shareType ?? "none");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = String(fd.get("name") ?? "").trim();
    if (!name) return setError("กรุณาใส่ชื่อช่องทาง");

    const sharePercent = toNum(fd.get("sharePercent"));
    if (shareType === "percent" && (sharePercent <= 0 || sharePercent > 100)) {
      return setError("ส่วนแบ่งต้องอยู่ระหว่าง 0–100%");
    }

    const row = {
      name,
      shareType,
      sharePercent: shareType === "percent" ? sharePercent : 0,
      fixedPrice: shareType === "fixed" ? toNum(fd.get("fixedPrice")) : 0,
      shippingCostPerTrip: toNum(fd.get("shippingCostPerTrip")),
      isActive: fd.get("isActive") !== null,
    };

    if (channel) {
      await db.channels.update(channel.id, row);
      onDone?.();
    } else {
      await db.channels.add({ ...row, id: newId(), createdAt: now() });
      form.reset();
      setShareType("none");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setError("");
  }

  const active = OPTIONS.find((o) => o.value === shareType);

  return (
    <Card title={channel ? "แก้ไขช่องทาง" : "เพิ่มช่องทางขาย"}>
      <form onSubmit={submit} className="space-y-3.5">
        <Field label="ชื่อช่องทาง">
          <input name="name" required defaultValue={channel?.name}
            placeholder="เช่น ฝากร้านกาแฟบ้านสวน" className={inputClass} />
        </Field>

        <Field label="รูปแบบส่วนแบ่ง" hint={active?.hint}>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-cream-100 p-1">
            {OPTIONS.map((o) => (
              <button key={o.value} type="button" onClick={() => setShareType(o.value)}
                className={`rounded-lg py-2 text-xs font-semibold transition ${
                  shareType === o.value ? "bg-white text-plum-700 shadow-sm" : "text-plum-400 hover:text-plum-600"}`}>
                {o.label}
              </button>
            ))}
          </div>
        </Field>

        {shareType === "percent" && (
          <Field label="ส่วนแบ่งที่ร้านหัก (%)">
            <input name="sharePercent" {...numberInput}
              defaultValue={channel?.sharePercent || ""} placeholder="เช่น 30" className={inputClass} />
          </Field>
        )}
        {shareType === "fixed" && (
          <Field label="ราคาส่งต่อหน่วย" hint="ราคานี้จะถูกใช้แทนราคามาตรฐานของสินค้า">
            <input name="fixedPrice" {...numberInput}
              defaultValue={channel?.fixedPrice || ""} placeholder="0.00" className={inputClass} />
          </Field>
        )}

        <Field label="ค่าขนส่ง/น้ำมัน ต่อรอบส่ง" hint="ใช้เป็นค่าตั้งต้นตอนบันทึกขาย แก้รายครั้งได้">
          <input name="shippingCostPerTrip" {...numberInput}
            defaultValue={channel?.shippingCostPerTrip || ""} placeholder="0.00" className={inputClass} />
        </Field>

        <label className="flex items-center gap-2 text-sm text-plum-600">
          <input type="checkbox" name="isActive" defaultChecked={channel?.isActive ?? true}
            className="size-4 rounded border-cream-200 accent-plum-600" />
          ยังใช้ช่องทางนี้อยู่
        </label>

        {error && <p className="rounded-xl bg-berry-500/10 px-3 py-2 text-sm text-berry-500">{error}</p>}
        {saved && <p className="rounded-xl bg-leaf-500/10 px-3 py-2 text-sm text-leaf-500">บันทึกแล้ว ✓</p>}

        <div className="flex gap-2">
          <Button type="submit" className="flex-1">
            {channel ? "บันทึกการแก้ไข" : "เพิ่มช่องทาง"}
          </Button>
          {channel && <Button type="button" variant="ghost" onClick={onDone}>ยกเลิก</Button>}
        </div>
      </form>
    </Card>
  );
}
