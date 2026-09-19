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

    const monthExpenses = allExpenses
      .filter((e) => e.spentOn >= monthStart)
      .reduce((s, e) => s + e.amount, 0);

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

export function useReport(from: string, to: string) {
  return useLiveQuery(async () => {
    const [rows, expenses] = await Promise.all([
      loadSales(from, to),
      db.expenses.toArray(),
    ]);
    const otherExpenses = expenses
      .filter((e) => e.spentOn >= from && e.spentOn <= to)
      .reduce((s, e) => s + e.amount, 0);

    return {
      totals: rows.length ? sumTotals(rows) : { ...EMPTY_TOTALS },
      otherExpenses,
      byProduct: groupTotals(rows, (t) => t.productId, (t) => t.productName),
      byChannel: groupTotals(rows, (t) => t.channelId, (t) => t.channelName),
      count: rows.length,
    };
  }, [from, to]);
}
