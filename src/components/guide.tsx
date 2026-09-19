"use client";

import { useEffect, useState } from "react";

const SEEN_KEY = "pjin-guide-seen";
const OPEN_EVENT = "pjin:open-guide";

/** เปิดคู่มือจากที่ไหนก็ได้ ไม่ต้องส่ง prop ลงไปทีละชั้น */
export function openGuide() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function Guide() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // เปิดอัตโนมัติเฉพาะครั้งแรกที่ใช้เครื่องนี้
    try {
      if (!localStorage.getItem(SEEN_KEY)) setOpen(true);
    } catch {
      // เบราว์เซอร์บล็อก storage — ข้ามไป ไม่ใช่เรื่องคอขาดบาดตาย
    }
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  // กันหน้าเลื่อนตอนเปิด modal + ปิดด้วยปุ่ม Esc
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {}
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-cocoa-700/40 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="คู่มือการใช้งาน"
    >
      <div
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-cream-50 shadow-2xl sm:max-h-[88dvh] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-cream-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-cocoa-700">คู่มือการใช้งาน</h2>
            <p className="text-xs text-cocoa-400">อ่านครั้งเดียวก็พอ เปิดซ้ำได้ที่ปุ่ม ❓</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="ปิด"
            className="shrink-0 rounded-full px-3 py-1.5 text-xl leading-none text-cocoa-400 transition hover:bg-cream-100 hover:text-cocoa-700"
          >
            ✕
          </button>
        </header>

        <div className="overflow-y-auto overscroll-contain px-5 py-5 [-webkit-overflow-scrolling:touch]">
          <Content />
        </div>

        <footer className="shrink-0 border-t border-cream-200 bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={close}
            className="w-full rounded-xl bg-cocoa-600 px-4 py-3 text-sm font-semibold text-cream-50 transition hover:bg-cocoa-700 active:scale-[0.99]"
          >
            เริ่มใช้งาน
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ---------------- เนื้อหาคู่มือ ---------------- */

function Content() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm leading-relaxed text-cocoa-600">
          แนะนำให้ใช้งานตามลำดับ เพื่อให้ระบบคำนวณต้นทุนและกำไรได้ถูกต้อง
        </p>
        <ol className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-2 text-xs font-semibold text-cocoa-500">
          {["ตั้งค่า", "สินค้า", "ช่องทาง", "รอบผลิต", "ขาย/ฝาก", "รายงาน"].map(
            (s, i) => (
              <li key={s} className="flex items-center gap-1.5">
                <span className="rounded-full bg-cream-200 px-2.5 py-1">
                  {i + 1}. {s}
                </span>
                {i < 5 && <span className="text-cocoa-400">→</span>}
              </li>
            ),
          )}
        </ol>
      </section>

      <Step n={1} icon="⚙️" title="ตั้งค่า" highlight>
        <p>
          กรอก <b>ค่าแรงต่อชั่วโมง</b> ของตนเอง เช่น 150 บาท/ชั่วโมง
        </p>
        <p>
          ค่าแรงเป็นข้อมูลสำคัญสำหรับการคำนวณ <b>กำไรสุทธิ</b> เพราะแอปออกแบบมา
          เพื่อช่วยตอบคำถามว่า
        </p>
        <blockquote className="border-l-3 border-cocoa-400 bg-cream-100 px-3 py-2 text-cocoa-700 italic">
          “รายได้ที่ได้รับ คุ้มกับเวลาและแรงที่ลงไปหรือไม่?”
        </blockquote>
        <p className="text-berry-500">
          หากไม่ระบุค่าแรง ระบบจะคำนวณกำไรสุทธิเท่ากับกำไรขั้นต้น
          ทำให้ไม่สามารถประเมินความคุ้มค่าของแรงงานได้อย่างแท้จริง
        </p>
      </Step>

      <Step n={2} icon="🧁" title="สินค้า">
        <p>เพิ่มสินค้าที่ผลิตและจำหน่าย โดยระบุ</p>
        <ul className="ml-4 list-disc space-y-0.5">
          <li>ชื่อสินค้า</li>
          <li>ราคาขายจริง</li>
          <li>หน่วยจำหน่าย เช่น ชิ้น กล่อง หรือถุง</li>
        </ul>
        <p className="rounded-xl bg-cream-100 px-3 py-2 text-xs">
          <b>ตัวอย่าง</b> — บราวนี่หน้ากรอบ · 60 บาท · หน่วย: ชิ้น
        </p>
      </Step>

      <Step n={3} icon="🏪" title="ช่องทางการขาย">
        <p>
          ระบบมีช่องทาง <b>ขายเอง</b> เป็นค่าเริ่มต้น
          และสามารถเพิ่มช่องทางฝากขายได้ตามรูปแบบที่ใช้งานจริง
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[22rem] border-collapse text-xs">
            <thead>
              <tr className="border-b border-cream-200 text-left text-cocoa-400">
                <th className="py-1.5 pr-3 font-semibold">รูปแบบ</th>
                <th className="py-1.5 font-semibold">ใช้เมื่อ</th>
              </tr>
            </thead>
            <tbody className="align-top">
              {[
                ["ขายเอง", "ได้รับราคาขายเต็มจำนวน"],
                ["หัก %", "ฝากขายและร้านหักเปอร์เซ็นต์จากราคาขาย"],
                ["ราคาคงที่", "ตกลงราคาส่งกับร้านเป็นจำนวนเงินคงที่ โดยไม่ขึ้นกับราคาหน้าร้าน"],
              ].map(([a, b]) => (
                <tr key={a} className="border-b border-cream-100 last:border-0">
                  <td className="py-2 pr-3 font-semibold text-cocoa-700">{a}</td>
                  <td className="py-2 text-cocoa-600">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          กำหนด <b>ค่าส่ง/ค่าน้ำมันต่อรอบ</b> ได้ด้วย
          ระบบจะนำค่านี้ไปเป็นค่าเริ่มต้นเมื่อบันทึกรายการขาย
        </p>
      </Step>

      <Step n={4} icon="🧑‍🍳" title="รอบผลิต" highlight>
        <p>
          ทุกครั้งที่ผลิตขนม ควรบันทึกข้อมูลทันที โดยกรอกข้อมูลหลัก 4 รายการ
        </p>
        <ol className="ml-4 list-decimal space-y-0.5">
          <li>จำนวนที่ผลิตได้จริง</li>
          <li>ค่าวัตถุดิบ — กรอกยอดรวม หรือแยกรายการก็ได้</li>
          <li>เวลาที่ใช้ — รวมเวลาเดินทางหรือไปส่งสินค้า</li>
          <li>ค่าใช้จ่ายแฝง — เช่น ค่าไฟ ค่าแก๊ส ค่ากล่อง และค่าน้ำมัน</li>
        </ol>
        <p>
          ระบบจะคำนวณ <b>ต้นทุนจริงต่อชิ้น</b> ให้ทันทีระหว่างกรอกข้อมูล
          และแจ้งเตือนหากราคาขายที่กำหนดไว้ไม่ครอบคลุมต้นทุน
        </p>
        <p>
          เมื่อกด <b>บันทึก</b> จำนวนสินค้าที่ผลิตได้จะถูกเพิ่มเข้าสู่สต๊อก
          โดยอัตโนมัติ
        </p>
      </Step>

      <Step n={5} icon="🧾" title="ขาย / ฝากขาย">
        <p className="rounded-xl bg-cream-100 px-3 py-2 text-center text-xs font-semibold text-cocoa-700">
          เลือกสินค้า → เลือกช่องทาง → ระบุจำนวน → ตรวจสอบกำไร → บันทึก
        </p>
        <p>
          ระบบจะแสดงกำไรที่คาดว่าจะได้รับก่อนบันทึก และ{" "}
          <b>ตัดสต๊อกโดยอัตโนมัติ</b> เมื่อบันทึกรายการ
        </p>
      </Step>

      <Step n={6} icon="📈" title="รายงาน">
        <p>ใช้หน้ารายงานเพื่อวิเคราะห์ว่า</p>
        <ul className="ml-4 list-disc space-y-0.5">
          <li>สินค้าชนิดใดสร้างกำไรได้ดี</li>
          <li>ช่องทางใดมีความคุ้มค่า</li>
          <li>ค่าแรงส่งผลต่อกำไรมากน้อยเพียงใด</li>
        </ul>
        <p>
          ระบบจะแสดง <b>กำไรขั้นต้น</b> และ <b>กำไรสุทธิ</b> ควบคู่กัน —
          ยิ่งช่องว่างระหว่างสองค่านี้มาก
          แสดงว่าต้นทุนค่าแรงและค่าใช้จ่ายอื่น ๆ มีผลต่อกำไรมากขึ้น
        </p>
      </Step>

      <Example />

      <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
        <h3 className="text-sm font-bold text-amber-700">
          ⚠️ การแจ้งเตือนบนหน้าภาพรวม
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-cocoa-600">
          หากระบบพบว่าผลตอบแทนไม่คุ้มกับต้นทุนและแรงงาน จะแสดงการแจ้งเตือน เช่น
        </p>
        <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold text-berry-500">
          ⚠️ ทำแล้วไม่ค่อยคุ้มแรง · มาร์จิ้นสุทธิ -10%
        </p>
        <p className="mt-2 text-sm leading-relaxed text-cocoa-600">
          เพื่อช่วยให้เห็นรายการที่ควรนำไปพิจารณาปรับราคา ลดต้นทุน
          หรือปรับช่องทางการขาย
        </p>
      </section>

      <section className="rounded-2xl border border-cream-200 bg-white p-4">
        <h3 className="text-sm font-bold text-cocoa-700">
          💾 ข้อจำกัดและการสำรองข้อมูล
        </h3>
        <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-cocoa-600">
          <li>
            • ข้อมูลจัดเก็บอยู่ <b>ภายในอุปกรณ์</b>{" "}
            เครื่องที่ใช้ทดสอบและเครื่องของผู้ใช้งานจะมีข้อมูลแยกจากกัน
          </li>
          <li>
            • หาก <b className="text-berry-500">ลบแอปออกจากหน้าจอหรือถอนการติดตั้ง</b>{" "}
            ข้อมูลอาจถูกลบและไม่สามารถเรียกคืนได้
          </li>
          <li>• แนะนำให้ <b>สำรองข้อมูลอย่างน้อยเดือนละ 1 ครั้ง</b></li>
          <li>
            • เมื่อเปลี่ยนโทรศัพท์ ควรส่งออกไฟล์สำรองจากเครื่องเดิม
            และนำเข้าไฟล์สำรองในเครื่องใหม่
          </li>
          <li>• ควรเก็บไฟล์สำรองไว้ในที่ปลอดภัย เพื่อป้องกันข้อมูลสูญหาย</li>
        </ul>
        <p className="mt-3 rounded-xl bg-cream-100 px-3 py-2 text-xs text-cocoa-500">
          ปุ่มสำรองข้อมูลอยู่ที่หน้า <b>ตั้งค่า</b>
        </p>
      </section>
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  highlight,
  children,
}: {
  n: number;
  icon: string;
  title: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border p-4 ${
        highlight
          ? "border-cocoa-400/40 bg-white shadow-sm"
          : "border-cream-200 bg-white"
      }`}
    >
      <h3 className="flex items-center gap-2 text-base font-bold text-cocoa-700">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-cocoa-600 text-sm text-cream-50">
          {n}
        </span>
        <span>{icon}</span>
        {title}
      </h3>
      <div className="mt-2.5 space-y-2 text-sm leading-relaxed text-cocoa-600">
        {children}
      </div>
    </section>
  );
}

function Example() {
  return (
    <section className="rounded-2xl border border-cream-200 bg-white p-4">
      <h3 className="text-base font-bold text-cocoa-700">🧪 ตัวอย่างการคำนวณ</h3>
      <p className="mt-2 text-sm text-cocoa-600">
        ทดลองใช้งานด้วยข้อมูลดังต่อไปนี้
      </p>

      <ul className="mt-2 space-y-0.5 text-sm text-cocoa-600">
        <li>• ค่าแรง 150 บาท/ชั่วโมง · ราคาขาย 60 บาท/ชิ้น</li>
        <li>• ช่องทาง: หัก 30% · ค่าส่ง 50 บาท/รอบ</li>
      </ul>

      <p className="mt-3 text-sm font-semibold text-cocoa-700">รอบผลิต</p>
      <p className="text-sm text-cocoa-600">
        ผลิตได้ 24 ชิ้น · วัตถุดิบ 380 บาท · เวลา 3.5 ชั่วโมง · ค่าแฝง 120 บาท
      </p>

      <Table
        rows={[
          ["ค่าแรง", "฿525.00"],
          ["รวมต้นทุนทั้งรอบ", "฿1,025.00"],
          ["ต้นทุนจริงต่อชิ้น", "฿42.71", true],
        ]}
      />

      <p className="mt-4 text-sm font-semibold text-cocoa-700">
        ทดลองขาย 10 ชิ้น ผ่านช่องทางที่หัก 30%
      </p>

      <Table
        rows={[
          ["ยอดขาย", "฿600.00"],
          ["กำไรขั้นต้น", "฿441.67"],
          ["กำไรสุทธิ", "-฿57.08", true, true],
          ["สต๊อกคงเหลือ", "14 ชิ้น"],
        ]}
      />

      <p className="mt-3 rounded-xl bg-cream-100 px-3 py-2.5 text-sm leading-relaxed text-cocoa-600">
        ยอดขาย 600 บาท กำไรขั้นต้น 441.67 บาท แต่เมื่อรวมต้นทุนค่าแรง
        และส่วนแบ่งของช่องทางขายแล้ว{" "}
        <b className="text-berry-500">กำไรสุทธิเป็น -57.08 บาท</b>
        <span className="mt-1.5 block text-xs text-cocoa-500">
          นี่คือประโยชน์สำคัญของแอป เพราะช่วยให้เห็นต้นทุนค่าแรง
          และกำไรสุทธิที่แท้จริง ซึ่งอาจไม่ปรากฏจากการจดบันทึกยอดขายทั่วไป
        </span>
      </p>
    </section>
  );
}

function Table({ rows }: { rows: (string | boolean | undefined)[][] }) {
  return (
    <dl className="mt-2 divide-y divide-cream-100 rounded-xl border border-cream-200">
      {rows.map(([label, value, bold, bad]) => (
        <div key={String(label)} className="flex justify-between gap-3 px-3 py-2">
          <dt className={`text-sm ${bold ? "font-semibold text-cocoa-700" : "text-cocoa-600"}`}>
            {label}
          </dt>
          <dd
            className={`tabular text-sm ${
              bad
                ? "font-bold text-berry-500"
                : bold
                  ? "font-bold text-cocoa-700"
                  : "text-cocoa-600"
            }`}
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
