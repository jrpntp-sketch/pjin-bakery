const baht = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const plain = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });

/** 1234.5 -> "฿1,234.50" · -57.08 -> "-฿57.08" (เครื่องหมายลบมาก่อนสัญลักษณ์เงิน)
 *  มีช่องไฟบาง ๆ หลัง ฿ เพราะฟอนต์ตัวเลขกับฟอนต์สัญลักษณ์บาทคนละตัว
 *  ถ้าไม่เว้น ตัวเลขจะเบียดทับสัญลักษณ์ */
const THIN_SPACE = "\u2009";
export function money(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return (v < 0 ? "-฿" : "฿") + THIN_SPACE + baht.format(Math.abs(v));
}

/** ตัดทศนิยมท้ายที่ไม่จำเป็นออก: 12 -> "12", 12.5 -> "12.5" */
export function num(n: number | null | undefined): string {
  return plain.format(Number(n ?? 0));
}

/** "2026-09-04" -> "4 ก.ย. 2569" */
export function thaiDate(d: string | Date | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d + "T00:00:00") : d;
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** วันนี้ในรูปแบบ YYYY-MM-DD ตามเวลาไทย */
export function todayISO(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

/** วันแรกของเดือนปัจจุบัน */
export function monthStartISO(): string {
  return todayISO().slice(0, 8) + "01";
}

/** คำอธิบายใต้ "กำไรหลังรับ-จ่ายอื่น"
 *  เลี่ยงการโชว์ยอดสุทธิติดลบ เพราะ "รับ-จ่ายอื่นสุทธิ -฿1,610" อ่านเหมือนขาดทุน
 *  ทั้งที่ความจริงคือรับเข้ามากกว่าจ่ายออก 1,610 บาท */
export function otherFlowHint(inAmt: number, outAmt: number): string {
  if (!inAmt && !outAmt) return "ยังไม่มีรับ-จ่ายอื่นในช่วงนี้";
  if (!inAmt) return `หักรายจ่ายอื่น ${money(outAmt)}`;
  if (!outAmt) return `บวกรายรับอื่น ${money(inAmt)}`;
  return `บวกรายรับอื่น ${money(inAmt)} · หักรายจ่ายอื่น ${money(outAmt)}`;
}
