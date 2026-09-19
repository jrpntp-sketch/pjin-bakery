import type {
  Batch,
  BatchComputed,
  Channel,
  Product,
  ProductStock,
  Transaction,
  TransactionComputed,
} from "./types";

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** ต้นทุนต่อหน่วยเก็บ 4 ตำแหน่ง — ปัดเหลือ 2 ทำให้ยอดรวมเพี้ยนหลักสตางค์ */
export function round4(n: number): number {
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}

/* ============================================================
   รอบผลิต — เดิมเป็น generated column ในตาราง batches
   ต้นทุนจริงต่อชิ้น = (วัตถุดิบ + ค่าแรง + ค่าแฝง) ÷ จำนวนที่ได้
   ============================================================ */
export function computeBatch(b: Batch): BatchComputed {
  const laborCost = b.hoursSpent * b.hourlyWageSnapshot;
  const totalCost = b.materialCost + b.overheadCost + laborCost;
  const qty = b.qtyProduced || 0;
  return {
    ...b,
    laborCost,
    totalCost,
    costPerUnit: qty > 0 ? totalCost / qty : 0,
    materialCostPerUnit: qty > 0 ? b.materialCost / qty : 0,
  };
}

/* ============================================================
   รายการขาย — เดิมเป็น generated column ในตาราง transactions
   กำไรขั้นต้น = ยอดขาย − ต้นทุนวัตถุดิบ
   กำไรสุทธิ   = ยอดขาย − ต้นทุนจริง − ส่วนแบ่งช่องทาง − ค่าส่ง
   ============================================================ */
export function computeTransaction(t: Transaction): TransactionComputed {
  const revenue = t.qty * t.unitPrice;
  return {
    ...t,
    revenue: round2(revenue),
    grossProfit: round2(revenue - t.qty * t.unitMaterialCost),
    netProfit: round2(
      revenue - t.qty * t.unitFullCost - t.channelShare - t.deliveryCost,
    ),
  };
}

/* ============================================================
   สต๊อก + ต้นทุนเฉลี่ย — เดิมเป็น view product_stock
   สต๊อก = ผลิตทั้งหมด − ขายทั้งหมด (คำนวณสด ไม่เก็บเป็นตัวเลขนิ่ง)
   ต้นทุนเฉลี่ยเป็นแบบ "ถ่วงน้ำหนัก" ไม่ใช่เฉลี่ยธรรมดา
   ============================================================ */
export function computeStock(
  product: Product,
  batches: Batch[],
  transactions: Transaction[],
): ProductStock {
  const mine = batches.filter((b) => b.productId === product.id);
  const sold = transactions
    .filter((t) => t.productId === product.id)
    .reduce((s, t) => s + t.qty, 0);

  let produced = 0;
  let totalCost = 0;
  let materialCost = 0;
  let lastProducedOn: string | null = null;

  for (const b of mine) {
    const c = computeBatch(b);
    produced += b.qtyProduced;
    totalCost += c.totalCost;
    materialCost += b.materialCost;
    if (!lastProducedOn || b.producedOn > lastProducedOn) {
      lastProducedOn = b.producedOn;
    }
  }

  return {
    product,
    totalProduced: produced,
    totalSold: sold,
    stockQty: produced - sold,
    avgCostPerUnit: produced > 0 ? totalCost / produced : 0,
    avgMaterialCostPerUnit: produced > 0 ? materialCost / produced : 0,
    lastProducedOn,
  };
}

/* ============================================================
   ราคาและส่วนแบ่งของช่องทางขาย
   ============================================================ */

/** ราคาขาย/หน่วยผ่านช่องทางนี้ — แบบ fixed ใช้ราคาช่องทาง นอกนั้นใช้ราคาสินค้า */
export function unitPriceFor(channel: Channel, basePrice: number): number {
  return channel.shareType === "fixed" ? channel.fixedPrice : basePrice;
}

/** ส่วนแบ่งที่ช่องทางหักไป (บาท) — คิดเฉพาะแบบ percent */
export function channelShareFor(
  channel: Channel,
  unitPrice: number,
  qty: number,
): number {
  if (channel.shareType !== "percent") return 0;
  return round2((unitPrice * qty * channel.sharePercent) / 100);
}

/* ============================================================
   รวมยอดสำหรับหน้าภาพรวมและรายงาน
   ============================================================ */
export type Totals = {
  revenue: number;
  gross: number;
  net: number;
  units: number;
  orders: number;
};

export const EMPTY_TOTALS: Totals = {
  revenue: 0,
  gross: 0,
  net: 0,
  units: 0,
  orders: 0,
};

export function sumTotals<T extends TransactionComputed>(rows: T[]): Totals {
  return rows.reduce<Totals>(
    (acc, t) => ({
      revenue: acc.revenue + t.revenue,
      gross: acc.gross + t.grossProfit,
      net: acc.net + t.netProfit,
      units: acc.units + t.qty,
      orders: acc.orders + 1,
    }),
    { ...EMPTY_TOTALS },
  );
}

/** จัดกลุ่มรายการขายตามสินค้าหรือช่องทาง แล้วรวมยอด */
export function groupTotals<T extends TransactionComputed>(
  rows: T[],
  keyOf: (t: T) => string,
  labelOf: (t: T) => string,
): Array<Totals & { id: string; label: string }> {
  const map = new Map<string, Totals & { id: string; label: string }>();
  for (const t of rows) {
    const id = keyOf(t);
    const cur = map.get(id) ?? { id, label: labelOf(t), ...EMPTY_TOTALS };
    cur.revenue += t.revenue;
    cur.gross += t.grossProfit;
    cur.net += t.netProfit;
    cur.units += t.qty;
    cur.orders += 1;
    map.set(id, cur);
  }
  return [...map.values()].sort((a, b) => b.net - a.net);
}
