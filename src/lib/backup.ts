"use client";

import { db, getSettings } from "./db";
import type {
  Batch,
  Channel,
  Expense,
  Product,
  Settings,
  Transaction,
} from "./types";

const FORMAT = "pjin-bakery-backup";
const VERSION = 1;

export type BackupFile = {
  format: typeof FORMAT;
  version: number;
  exportedAt: string;
  counts: Record<string, number>;
  data: {
    settings: Settings;
    products: Product[];
    channels: Channel[];
    batches: Batch[];
    transactions: Transaction[];
    expenses: Expense[];
  };
};

export async function buildBackup(): Promise<BackupFile> {
  const [settings, products, channels, batches, transactions, expenses] =
    await Promise.all([
      getSettings(),
      db.products.toArray(),
      db.channels.toArray(),
      db.batches.toArray(),
      db.transactions.toArray(),
      db.expenses.toArray(),
    ]);

  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    counts: {
      products: products.length,
      channels: channels.length,
      batches: batches.length,
      transactions: transactions.length,
      expenses: expenses.length,
    },
    data: { settings, products, channels, batches, transactions, expenses },
  };
}

/** ดาวน์โหลดไฟล์ backup — ชื่อไฟล์มีวันที่เพื่อไม่ให้ทับกัน */
export async function downloadBackup(): Promise<void> {
  const backup = await buildBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ข้อมูลร้านขนม-${backup.exportedAt.slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type RestoreResult =
  | { ok: true; counts: Record<string, number> }
  | { ok: false; error: string };

/**
 * กู้ข้อมูลจากไฟล์ backup — เขียนทับของเดิมทั้งหมด
 * ตรวจรูปแบบไฟล์ก่อนเสมอ เพื่อไม่ให้ไฟล์ผิดมาล้างข้อมูลที่มีอยู่
 */
export async function restoreBackup(file: File): Promise<RestoreResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    return { ok: false, error: "รูปแบบไฟล์ไม่ถูกต้องหรือไม่สามารถอ่านข้อมูลได้" };
  }

  const backup = parsed as Partial<BackupFile>;
  if (backup?.format !== FORMAT) {
    return {
      ok: false,
      error: "ไฟล์นี้ไม่ใช่ไฟล์สำรองข้อมูลของระบบ กรุณาเลือกไฟล์ที่ถูกต้อง",
    };
  }
  if (typeof backup.version !== "number" || backup.version > VERSION) {
    return {
      ok: false,
      error: "ไฟล์นี้มาจากแอปเวอร์ชันใหม่กว่า — อัปเดตแอปก่อนแล้วลองใหม่",
    };
  }
  const d = backup.data;
  if (!d || !Array.isArray(d.products) || !Array.isArray(d.batches)) {
    return { ok: false, error: "ไฟล์เสียหาย — ข้อมูลข้างในไม่ครบ" };
  }

  await db.transaction(
    "rw",
    [db.settings, db.products, db.channels, db.batches, db.transactions, db.expenses],
    async () => {
      await Promise.all([
        db.settings.clear(),
        db.products.clear(),
        db.channels.clear(),
        db.batches.clear(),
        db.transactions.clear(),
        db.expenses.clear(),
      ]);
      await Promise.all([
        db.settings.put({ ...d.settings, id: 1 }),
        db.products.bulkAdd(d.products ?? []),
        db.channels.bulkAdd(d.channels ?? []),
        db.batches.bulkAdd(d.batches ?? []),
        db.transactions.bulkAdd(d.transactions ?? []),
        db.expenses.bulkAdd(d.expenses ?? []),
      ]);
    },
  );

  return {
    ok: true,
    counts: {
      products: d.products?.length ?? 0,
      channels: d.channels?.length ?? 0,
      batches: d.batches?.length ?? 0,
      transactions: d.transactions?.length ?? 0,
      expenses: d.expenses?.length ?? 0,
    },
  };
}

/** ลบข้อมูลทั้งหมด — ใช้ตอนอยากเริ่มใหม่ */
export async function wipeAll(): Promise<void> {
  await db.transaction(
    "rw",
    [db.settings, db.products, db.channels, db.batches, db.transactions, db.expenses],
    async () => {
      await Promise.all([
        db.settings.clear(),
        db.products.clear(),
        db.channels.clear(),
        db.batches.clear(),
        db.transactions.clear(),
        db.expenses.clear(),
      ]);
    },
  );
}

/** เช็คว่าเบราว์เซอร์รับปากจะไม่ล้างข้อมูลทิ้งหรือยัง (สำคัญบน iOS) */
export async function requestPersistence(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  if (await navigator.storage.persisted?.()) return true;
  return navigator.storage.persist();
}
