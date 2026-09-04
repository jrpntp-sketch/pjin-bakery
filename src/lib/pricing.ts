import type { Channel } from "./types";

/**
 * ราคาขายต่อหน่วยของสินค้าผ่านช่องทางนี้
 * - fixed  : ใช้ราคาคงที่ของช่องทาง
 * - อื่น ๆ : ใช้ราคามาตรฐานของสินค้า
 */
export function unitPriceFor(channel: Channel, basePrice: number): number {
  return channel.share_type === "fixed" ? channel.fixed_price : basePrice;
}

/** ส่วนแบ่งที่ช่องทางหักไป (บาท) — คิดเฉพาะแบบ percent */
export function channelShareFor(
  channel: Channel,
  unitPrice: number,
  qty: number,
): number {
  if (channel.share_type !== "percent") return 0;
  return round2((unitPrice * qty * channel.share_percent) / 100);
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** ใช้กับต้นทุนต่อหน่วย — คอลัมน์เก็บ 4 ตำแหน่ง การปัดเหลือ 2 ทำให้ยอดรวมเพี้ยน */
export function round4(n: number): number {
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}

/** อ่านตัวเลขจาก FormData แบบปลอดภัย (ว่าง/ผิดรูป -> ค่า default) */
export function numField(fd: FormData, key: string, fallback = 0): number {
  const raw = fd.get(key);
  if (raw === null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function strField(fd: FormData, key: string, fallback = ""): string {
  const raw = fd.get(key);
  return typeof raw === "string" && raw.trim() !== "" ? raw.trim() : fallback;
}
