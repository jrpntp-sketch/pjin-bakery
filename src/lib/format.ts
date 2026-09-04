const baht = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const plain = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });

/** 1234.5 -> "฿1,234.50" · -57.08 -> "-฿57.08" (เครื่องหมายลบมาก่อนสัญลักษณ์เงิน) */
export function money(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return (v < 0 ? "-฿" : "฿") + baht.format(Math.abs(v));
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
