"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_SETTINGS } from "./db";
import {
  computeBatch,
  computeStock,
  computeTransaction,
  groupTotals,
  sumTotals,
  EMPTY_TOTALS,
} from "./calc";
import { monthStartISO, todayISO } from "./format";
import type { ProductStock, TransactionComputed } from "./types";

/* ค่า useLiveQuery จะอัปเดตเองทุกครั้งที่ข้อมูลใน IndexedDB เปลี่ยน */

export function useSettings() {
  return useLiveQuery(async () => (await db.settings.get(1)) ?? DEFAULT_SETTINGS, []);
}

export function useProducts(activeOnly = false) {
  return useLiveQuery(async () => {
    const all = await db.products.toArray();
    const rows = activeOnly ? all.filter((p) => p.isActive) : all;
    return rows.sort((a, b) => a.name.localeCompare(b.name, "th"));
  }, [activeOnly]);
}

export function useChannels(activeOnly = false) {
  return useLiveQuery(async () => {
    const all = await db.channels.toArray();
    const rows = activeOnly ? all.filter((c) => c.isActive) : all;
    return rows.sort((a, b) => a.name.localeCompare(b.name, "th"));
  }, [activeOnly]);
}

export function useBatches(limit = 100) {
  return useLiveQuery(async () => {
    const [batches, products] = await Promise.all([
      db.batches.toArray(),
      db.products.toArray(),
    ]);
    const byId = new Map(products.map((p) => [p.id, p]));
    return batches
      .sort((a, b) =>
        b.producedOn.localeCompare(a.producedOn) ||
        b.createdAt.localeCompare(a.createdAt),
      )
      .slice(0, limit)
      .map((b) => ({ ...computeBatch(b), product: byId.get(b.productId) }));
  }, [limit]);
}

/** สต็อกของทุกสินค้า คำนวณสดจาก ผลิต − ขาย */
export function useStock(activeOnly = false): ProductStock[] | undefined {
  return useLiveQuery(async () => {
    const [products, batches, transactions] = await Promise.all([
      db.products.toArray(),
      db.batches.toArray(),
      db.transactions.toArray(),
    ]);
    return products
      .filter((p) => (activeOnly ? p.isActive : true))
      .map((p) => computeStock(p, batches, transactions))
      .sort((a, b) => a.product.name.localeCompare(b.product.name, "th"));
  }, [activeOnly]);
}

export type SaleRow = TransactionComputed & {
  productName: string;
  productUnit: string;
  channelName: string;
};

async function loadSales(from?: string, to?: string): Promise<SaleRow[]> {
  const [transactions, products, channels] = await Promise.all([
    db.transactions.toArray(),
    db.products.toArray(),
    db.channels.toArray(),
  ]);
  const p = new Map(products.map((x) => [x.id, x]));
  const c = new Map(channels.map((x) => [x.id, x]));

  return transactions
    .filter((t) => (!from || t.soldOn >= from) && (!to || t.soldOn <= to))
    .sort((a, b) =>
      b.soldOn.localeCompare(a.soldOn) || b.createdAt.localeCompare(a.createdAt),
    )
    .map((t) => ({
      ...computeTransaction(t),
      productName: p.get(t.productId)?.name ?? "สินค้าที่ถูกลบ",
      productUnit: p.get(t.productId)?.unit ?? "ชิ้น",
      channelName: c.get(t.channelId)?.name ?? "ช่องทางที่ถูกลบ",
    }));
}

export function useSales(limit = 50) {
  return useLiveQuery(async () => (await loadSales()).slice(0, limit), [limit]);
}

export function useExpenses(limit = 100) {
  return useLiveQuery(
    async () =>
      (await db.expenses.toArray())
        .sort((a, b) => b.spentOn.localeCompare(a.spentOn))
        .slice(0, limit),
    [limit],
  );
}

/** ข้อมูลทั้งหมดที่หน้าภาพรวมต้องใช้ */
export function useDashboard() {
  return useLiveQuery(async () => {
    const today = todayISO();
    const monthStart = monthStartISO();

    const [monthRows, stock, allExpenses] = await Promise.all([
      loadSales(monthStart),
      (async () => {
        const [products, batches, transactions] = await Promise.all([
          db.products.toArray(),
          db.batches.toArray(),
          db.transactions.toArray(),
        ]);
        return products
          .filter((p) => p.isActive)
          .map((p) => computeStock(p, batches, transactions));
      })(),
      db.expenses.toArray(),
    ]);

    // "รายจ่ายอื่น" ในภาพรวม = ขาออกสุทธิ (จ่ายออก − รับเข้า)
    // เพราะรายรับอื่นก็ทำให้เงินเหลือมากขึ้นเหมือนกัน
    const monthOther = allExpenses.filter((e) => e.spentOn >= monthStart);
    const monthExpenses =
      monthOther.filter((e) => e.kind !== "in").reduce((s, e) => s + e.amount, 0) -
      monthOther.filter((e) => e.kind === "in").reduce((s, e) => s + e.amount, 0);

    const byProduct = groupTotals(
      monthRows,
      (t) => t.productId,
      (t) => t.productName,
    );

    return {
      today: sumTotals(monthRows.filter((t) => t.soldOn === today)),
      month: sumTotals(monthRows),
      monthExpenses,
      lowStock: stock
        .filter((s) => s.stockQty <= s.product.lowStockThreshold)
        .sort((a, b) => a.stockQty - b.stockQty),
      // "ไม่คุ้มแรง" = กำไรสุทธิติดลบ หรืออัตรากำไรสุทธิต่ำกว่า 10%
      unprofitable: byProduct
        .filter((p) => p.net <= 0 || (p.revenue > 0 && p.net / p.revenue < 0.1))
        .sort((a, b) => a.net - b.net),
      recent: monthRows.slice(0, 5),
      productCount: stock.length,
    };
  }, []);
}

/**
 * รายรับ-รายจ่าย = เงินสดเข้าออกจริง ต่างจากหน้ารายงานที่ดู "กำไร"
 *
 * จุดต่างที่สำคัญ: ค่าแรงตัวเองไม่นับเป็นเงินออก เพราะไม่ได้จ่ายให้ใครจริง
 * เป็นต้นทุนค่าเสียโอกาส ใช้ตอบว่า "คุ้มแรงไหม" ซึ่งเป็นคำถามคนละข้อ
 * กับ "ตอนนี้มีเงินเหลือเท่าไหร่"
 *
 * เงินที่ได้รับจริงจากการขาย = ยอดขาย − ส่วนแบ่งช่องทาง
 * เพราะร้านที่ฝากขายหักส่วนแบ่งก่อนจ่ายให้เรา
 */
export function useCashflow(from: string, to: string) {
  return useLiveQuery(async () => {
    const inRange = (d: string) => d >= from && d <= to;
    const [products, batches, transactions, channels, expenses] = await Promise.all([
      db.products.toArray(),
      db.batches.toArray(),
      db.transactions.toArray(),
      db.channels.toArray(),
      db.expenses.toArray(),
    ]);
    const pName = new Map(products.map((p) => [p.id, p.name]));
    const cName = new Map(channels.map((c) => [c.id, c.name]));

    const sales = transactions.filter((t) => inRange(t.soldOn));
    const runs = batches.filter((b) => inRange(b.producedOn));
    const otherAll = expenses.filter((e) => inRange(e.spentOn));
    const otherIn = otherAll.filter((e) => e.kind === "in");
    const other = otherAll.filter((e) => e.kind !== "in");

    const grossSales = sales.reduce((s, t) => s + t.qty * t.unitPrice, 0);
    const channelShare = sales.reduce((s, t) => s + t.channelShare, 0);
    const otherInTotal = otherIn.reduce((s, e) => s + e.amount, 0);
    const received = grossSales - channelShare + otherInTotal;

    const materials = runs.reduce((s, b) => s + b.materialCost, 0);
    const overhead = runs.reduce((s, b) => s + b.overheadCost, 0);
    const delivery = sales.reduce((s, t) => s + t.deliveryCost, 0);
    const otherOut = other.reduce((s, e) => s + e.amount, 0);
    const paidOut = materials + overhead + delivery + otherOut;

    // ไม่รวมในเงินออก แต่แสดงให้เห็นเพื่อเทียบกับหน้ารายงาน
    const ownLabor = runs.reduce((s, b) => s + b.hoursSpent * b.hourlyWageSnapshot, 0);
    const hours = runs.reduce((s, b) => s + b.hoursSpent, 0);

    type Move = {
      id: string; date: string; label: string; detail: string;
      amount: number; kind: "in" | "out";
    };
    const moves: Move[] = [
      ...sales.map((t) => ({
        id: "s" + t.id,
        date: t.soldOn,
        label: pName.get(t.productId) ?? "สินค้าที่ถูกลบ",
        detail: `ขาย ${t.qty} · ${cName.get(t.channelId) ?? "—"}` +
          (t.channelShare > 0 ? ` · หักส่วนแบ่ง ${t.channelShare.toFixed(2)}` : ""),
        amount: t.qty * t.unitPrice - t.channelShare,
        kind: "in" as const,
      })),
      ...runs.flatMap((b) => {
        const name = pName.get(b.productId) ?? "สินค้าที่ถูกลบ";
        const rows: Move[] = [];
        if (b.materialCost > 0)
          rows.push({ id: "m" + b.id, date: b.producedOn, label: "ค่าวัตถุดิบ",
            detail: `${name} · ผลิต ${b.qtyProduced}`, amount: b.materialCost, kind: "out" });
        if (b.overheadCost > 0)
          rows.push({ id: "o" + b.id, date: b.producedOn, label: "ค่าแฝง",
            detail: name, amount: b.overheadCost, kind: "out" });
        return rows;
      }),
      ...sales.filter((t) => t.deliveryCost > 0).map((t) => ({
        id: "d" + t.id, date: t.soldOn, label: "ค่าส่ง",
        detail: cName.get(t.channelId) ?? "—",
        amount: t.deliveryCost, kind: "out" as const,
      })),
      ...other.map((e) => ({
        id: "e" + e.id, date: e.spentOn, label: e.category,
        detail: e.note ?? "", amount: e.amount, kind: "out" as const,
      })),
      ...otherIn.map((e) => ({
        id: "i" + e.id, date: e.spentOn, label: e.category,
        detail: e.note ?? "", amount: e.amount, kind: "in" as const,
      })),
    ].sort((a, b) => b.date.localeCompare(a.date));

    return {
      in: { grossSales, channelShare, otherIn: otherInTotal, received },
      out: { materials, overhead, delivery, other: otherOut, total: paidOut },
      net: received - paidOut,
      ownLabor, hours,
      moves,
      count: moves.length,
    };
  }, [from, to]);
}

export function useReport(from: string, to: string) {
  return useLiveQuery(async () => {
    const [rows, expenses] = await Promise.all([
      loadSales(from, to),
      db.expenses.toArray(),
    ]);
    const inRange = expenses.filter((e) => e.spentOn >= from && e.spentOn <= to);
    const otherExpenses =
      inRange.filter((e) => e.kind !== "in").reduce((s, e) => s + e.amount, 0) -
      inRange.filter((e) => e.kind === "in").reduce((s, e) => s + e.amount, 0);

    return {
      totals: rows.length ? sumTotals(rows) : { ...EMPTY_TOTALS },
      otherExpenses,
      byProduct: groupTotals(rows, (t) => t.productId, (t) => t.productName),
      byChannel: groupTotals(rows, (t) => t.channelId, (t) => t.channelName),
      count: rows.length,
    };
  }, [from, to]);
}
