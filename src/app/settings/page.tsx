"use client";

import { useEffect, useRef, useState } from "react";
import { toNum } from "@/lib/calc";
import { db, DEFAULT_SETTINGS } from "@/lib/db";
import { useSettings } from "@/lib/hooks";
import { downloadBackup, restoreBackup, wipeAll, requestPersistence } from "@/lib/backup";
import { money } from "@/lib/format";
import { Button, Card, Field, inputClass, numberInput, PageHeader } from "@/components/ui";
import { openGuide } from "@/components/guide";

export default function SettingsPage() {
  const settings = useSettings();
  const [saved, setSaved] = useState(false);

  if (!settings) return <div className="h-40 animate-pulse rounded-2xl bg-cream-100" />;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await db.settings.put({
      ...DEFAULT_SETTINGS,
      shopName: String(fd.get("shopName") ?? "ร้านขนม").trim() || "ร้านขนม",
      hourlyWage: Math.max(0, toNum(fd.get("hourlyWage"))),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <>
      <PageHeader title="ตั้งค่า"
        subtitle="กำหนดค่าแรงต่อชั่วโมงและข้อมูลพื้นฐานของร้าน" />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card title="ข้อมูลร้าน">
            <form onSubmit={submit} className="space-y-3.5">
              <Field label="ชื่อร้าน">
                <input name="shopName" required defaultValue={settings.shopName} className={inputClass} />
              </Field>
              <Field label="ค่าแรงของตัวเอง ต่อชั่วโมง (บาท)">
                <input name="hourlyWage" {...numberInput}
                  defaultValue={settings.hourlyWage || ""} placeholder="เช่น 150" className={inputClass} />
              </Field>
              {saved && (
                <p className="rounded-xl bg-leaf-500/10 px-3 py-2 text-sm text-leaf-500">
                  บันทึกสำเร็จ (มีผลกับรอบการผลิตถัดไป)
                </p>
              )}
              <Button type="submit" className="w-full">บันทึกการตั้งค่า</Button>
            </form>
          </Card>

          <BackupCard />
        </div>

        <div className="space-y-4">
          <StorageCard />

          <Card title="❓ คู่มือการใช้งาน">
            <p className="mb-3 text-sm text-plum-600">
              ขั้นตอนการใช้งานทั้งหมด ตัวอย่างการคำนวณ และวิธีสำรองข้อมูล
            </p>
            <Button type="button" variant="ghost" onClick={openGuide}>
              เปิดคู่มือ
            </Button>
          </Card>

          <Card title="ระบบคิดต้นทุนยังไง">
            <div className="space-y-3 text-sm text-plum-600">
              <p>
                <span className="font-semibold text-plum-700">ต้นทุนจริงต่อชิ้น</span> ={" "}
                (วัตถุดิบ + ค่าแรง + ค่าแฝง) ÷ จำนวนที่ได้ต่อรอบ
              </p>
              <p>
                <span className="font-semibold text-plum-700">กำไรขั้นต้น</span> = ยอดขาย − ต้นทุนวัตถุดิบ
                <span className="block text-xs text-plum-400">
                  กำไรจากการขายที่ยังไม่รวมต้นทุนค่าแรงและค่าใช้จ่ายแฝง
                </span>
              </p>
              <p>
                <span className="font-semibold text-plum-700">กำไรสุทธิ</span> = ยอดขาย −
                ต้นทุนจริงต่อชิ้น − ส่วนแบ่งช่องทาง − ค่าส่ง
                <span className="block text-xs text-plum-400">กำไรจริงหลังหักต้นทุนและค่าใช้จ่ายทุกส่วน</span>
              </p>
              <p className="rounded-xl bg-cream-50 p-3 text-xs text-plum-400">
                อัตราค่าแรงจะถูกบันทึกแยกตามรอบผลิต
                การแก้ไขค่าแรงในปัจจุบันจะไม่มีผลย้อนหลัง
                เพื่อรักษาความถูกต้องของประวัติข้อมูล
              </p>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function BackupCard() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!confirm("กู้ข้อมูลจากไฟล์นี้? ข้อมูลที่มีอยู่ตอนนี้จะถูกเขียนทับทั้งหมด")) return;

    const r = await restoreBackup(file);
    setMsg(r.ok
      ? { tone: "ok", text: `กู้ข้อมูลสำเร็จ — สินค้า ${r.counts.products} · รอบผลิต ${r.counts.batches} · รายการขาย ${r.counts.transactions}` }
      : { tone: "err", text: r.error });
  }

  return (
    <Card title="💾 สำรองข้อมูล">
      <p className="mb-3 text-sm text-plum-600">
        ข้อมูลจัดเก็บเฉพาะในอุปกรณ์นี้เท่านั้น{" "}
        <span className="font-semibold text-plum-700">
          การลบแอปจะทำให้ข้อมูลสูญหาย
        </span>{" "}
        กรุณากดสำรองข้อมูลสม่ำเสมอและบันทึกไฟล์ไว้ในพื้นที่ปลอดภัย
      </p>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => downloadBackup()}>⬇ สำรองข้อมูลตอนนี้</Button>
        <Button type="button" variant="ghost" onClick={() => fileRef.current?.click()}>
          ⬆ กู้จากไฟล์
        </Button>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} className="hidden" />
      </div>

      {msg && (
        <p className={`mt-3 rounded-xl px-3 py-2 text-sm ${
          msg.tone === "ok" ? "bg-leaf-500/10 text-leaf-500" : "bg-berry-500/10 text-berry-500"}`}>
          {msg.text}
        </p>
      )}

      <button type="button"
        onClick={async () => {
          if (!confirm("ลบข้อมูลทั้งหมดและเริ่มใหม่? กู้คืนไม่ได้")) return;
          if (!confirm("ยืนยันการลบข้อมูล? คุณได้สำรองข้อมูลไว้แล้วหรือไม่")) return;
          await wipeAll();
          location.reload();
        }}
        className="mt-4 text-xs font-semibold text-plum-400 transition hover:text-berry-500">
        ลบข้อมูลทั้งหมดแล้วเริ่มใหม่
      </button>
    </Card>
  );
}

function StorageCard() {
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [usage, setUsage] = useState<string>("");

  useEffect(() => {
    (async () => {
      if (navigator.storage?.persisted) setPersisted(await navigator.storage.persisted());
      if (navigator.storage?.estimate) {
        const est = await navigator.storage.estimate();
        if (est.usage != null) setUsage((est.usage / 1024).toFixed(0) + " KB");
      }
    })();
  }, []);

  return (
    <Card title="📱 ที่เก็บข้อมูล">
      <div className="space-y-3 text-sm text-plum-600">
        <p>
          ข้อมูลทั้งหมดอยู่ในเครื่องนี้ ไม่ได้ส่งไปไหน ไม่ต้องล็อกอิน ใช้ได้แม้ไม่มีเน็ต
          {usage && <span className="block text-xs text-plum-400">ใช้พื้นที่ {usage}</span>}
        </p>

        <div className={`rounded-xl p-3 text-xs ${
          persisted ? "bg-leaf-500/10 text-leaf-500" : "bg-peach-500/15 text-peach-700"}`}>
          {persisted === null ? "กำลังตรวจสอบ…"
            : persisted ? "✓ เปิดใช้งานการจัดเก็บข้อมูลถาวรแล้ว"
            : "⚠️ ยังไม่ได้เปิดใช้งานการจัดเก็บข้อมูลถาวร"}
        </div>

        {!persisted && (
          <Button type="button" variant="ghost"
            onClick={async () => setPersisted(await requestPersistence())}>
            เปิดใช้งานการจัดเก็บข้อมูลถาวร
          </Button>
        )}

        <div className="rounded-xl bg-cream-50 p-3 text-xs text-plum-400">
          <p className="mb-1 font-semibold text-plum-600">📌 สำคัญสำหรับ iPhone</p>
          กรุณากด{" "}
          <span className="font-semibold">
            แชร์ → เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)
          </span>{" "}
          เพื่อป้องกัน Safari ล้างข้อมูลอัตโนมัติเมื่อไม่ได้ใช้งาน
        </div>
      </div>
    </Card>
  );
}
