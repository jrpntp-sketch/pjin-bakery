export type ShareType = "none" | "percent" | "fixed";

export type Settings = {
  id: 1;
  shopName: string;
  hourlyWage: number;
};

export type Product = {
  id: string;
  name: string;
  unit: string;
  basePrice: number;
  lowStockThreshold: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
};

export type Channel = {
  id: string;
  name: string;
  shareType: ShareType;
  sharePercent: number;
  fixedPrice: number;
  shippingCostPerTrip: number;
  isActive: boolean;
  createdAt: string;
};

/** วัตถุดิบย่อยเก็บฝังในรอบผลิตเลย ไม่ต้องแยกตาราง */
export type Material = { name: string; cost: number };

export type Batch = {
  id: string;
  productId: string;
  producedOn: string; // YYYY-MM-DD
  qtyProduced: number;
  hoursSpent: number;
  /** ค่าแรง ณ วันที่บันทึก — ปรับค่าแรงภายหลังแล้วรอบเก่าไม่เปลี่ยนตาม */
  hourlyWageSnapshot: number;
  materialCost: number;
  overheadCost: number;
  materials?: Material[];
  notes?: string;
  createdAt: string;
};

export type Transaction = {
  id: string;
  productId: string;
  channelId: string;
  soldOn: string; // YYYY-MM-DD
  qty: number;
  unitPrice: number;
  deliveryCost: number;
  /** ต้นทุน ณ เวลาขาย — ผลิตรอบใหม่แล้วกำไรรายการเก่าไม่ขยับ */
  unitFullCost: number;
  unitMaterialCost: number;
  channelShare: number;
  notes?: string;
  createdAt: string;
};

export type Expense = {
  id: string;
  category: string;
  amount: number;
  spentOn: string; // YYYY-MM-DD
  note?: string;
  createdAt: string;
};

/** ค่าที่คำนวณจากรอบผลิต (เดิมเป็น generated column ใน Postgres) */
export type BatchComputed = Batch & {
  laborCost: number;
  totalCost: number;
  costPerUnit: number;
  materialCostPerUnit: number;
};

/** ค่าที่คำนวณจากรายการขาย */
export type TransactionComputed = Transaction & {
  revenue: number;
  grossProfit: number;
  netProfit: number;
};

/** สรุปสต๊อก + ต้นทุนเฉลี่ยของสินค้า (เดิมเป็น view product_stock) */
export type ProductStock = {
  product: Product;
  totalProduced: number;
  totalSold: number;
  stockQty: number;
  avgCostPerUnit: number;
  avgMaterialCostPerUnit: number;
  lastProducedOn: string | null;
};
