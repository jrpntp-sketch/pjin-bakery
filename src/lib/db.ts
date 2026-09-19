"use client";

import Dexie, { type EntityTable } from "dexie";
import type {
  Batch,
  Channel,
  Expense,
  Product,
  Settings,
  Transaction,
} from "./types";

/**
 * ข้อมูลทั้งหมดอยู่ใน IndexedDB ของเบราว์เซอร์เครื่องผู้ใช้
 * ไม่มีเซิร์ฟเวอร์ ไม่มีบัญชี ไม่ต้องต่อเน็ต
 */
class BakeryDB extends Dexie {
  settings!: EntityTable<Settings, "id">;
  products!: EntityTable<Product, "id">;
  channels!: EntityTable<Channel, "id">;
  batches!: EntityTable<Batch, "id">;
  transactions!: EntityTable<Transaction, "id">;
  expenses!: EntityTable<Expense, "id">;

  constructor() {
    super("pjin-bakery");
    this.version(1).stores({
      settings: "id",
      products: "id, name, isActive",
      channels: "id, name, isActive",
      batches: "id, productId, producedOn",
      transactions: "id, productId, channelId, soldOn",
      expenses: "id, spentOn, category",
    });
  }
}

export const db = new BakeryDB();

export const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2);

export const now = () => new Date().toISOString();

export const DEFAULT_SETTINGS: Settings = {
  id: 1,
  shopName: "ร้านขนม",
  hourlyWage: 0,
};

/** เรียกครั้งแรกที่เปิดแอป — สร้างค่าตั้งต้นและช่องทาง "ขายเอง" ให้ */
export async function ensureSeeded(): Promise<void> {
  const existing = await db.settings.get(1);
  if (existing) return;

  await db.transaction("rw", db.settings, db.channels, async () => {
    await db.settings.put(DEFAULT_SETTINGS);
    if ((await db.channels.count()) === 0) {
      await db.channels.add({
        id: newId(),
        name: "ขายเอง",
        shareType: "none",
        sharePercent: 0,
        fixedPrice: 0,
        shippingCostPerTrip: 0,
        isActive: true,
        createdAt: now(),
      });
    }
  });
}

export async function getSettings(): Promise<Settings> {
  return (await db.settings.get(1)) ?? DEFAULT_SETTINGS;
}

/** ลบสินค้า — ถ้ามีประวัติผลิตหรือขายอยู่ จะปิดการใช้งานแทนเพื่อไม่ให้ประวัติพัง */
export async function removeProduct(id: string): Promise<"deleted" | "archived"> {
  const [batches, sales] = await Promise.all([
    db.batches.where("productId").equals(id).count(),
    db.transactions.where("productId").equals(id).count(),
  ]);
  if (batches > 0 || sales > 0) {
    await db.products.update(id, { isActive: false });
    return "archived";
  }
  await db.products.delete(id);
  return "deleted";
}

export async function removeChannel(id: string): Promise<"deleted" | "archived"> {
  const sales = await db.transactions.where("channelId").equals(id).count();
  if (sales > 0) {
    await db.channels.update(id, { isActive: false });
    return "archived";
  }
  await db.channels.delete(id);
  return "deleted";
}
