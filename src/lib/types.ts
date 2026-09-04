export type ShareType = "none" | "percent" | "fixed";

export type Settings = {
  user_id: string;
  shop_name: string;
  currency: string;
  hourly_wage: number;
};

export type Product = {
  id: string;
  user_id: string;
  name: string;
  unit: string;
  base_price: number;
  low_stock_threshold: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

export type Channel = {
  id: string;
  user_id: string;
  name: string;
  share_type: ShareType;
  share_percent: number;
  fixed_price: number;
  shipping_cost_per_trip: number;
  is_active: boolean;
};

export type Batch = {
  id: string;
  user_id: string;
  product_id: string;
  produced_on: string;
  qty_produced: number;
  hours_spent: number;
  hourly_wage_snapshot: number;
  material_cost: number;
  overhead_cost: number;
  notes: string | null;
  labor_cost: number;
  total_cost: number;
  cost_per_unit: number;
  material_cost_per_unit: number;
};

export type BatchMaterial = {
  id: string;
  batch_id: string;
  name: string;
  cost: number;
};

export type Transaction = {
  id: string;
  user_id: string;
  product_id: string;
  channel_id: string;
  sold_on: string;
  qty: number;
  unit_price: number;
  delivery_cost: number;
  unit_full_cost: number;
  unit_material_cost: number;
  channel_share: number;
  notes: string | null;
  revenue: number;
  gross_profit: number;
  net_profit: number;
};

export type TransactionDetail = Transaction & {
  product_name: string;
  product_unit: string;
  channel_name: string;
};

export type Expense = {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  spent_on: string;
  note: string | null;
};

export type ProductStock = {
  product_id: string;
  user_id: string;
  name: string;
  unit: string;
  base_price: number;
  low_stock_threshold: number;
  is_active: boolean;
  total_produced: number;
  total_sold: number;
  stock_qty: number;
  avg_cost_per_unit: number;
  avg_material_cost_per_unit: number;
  last_produced_on: string | null;
};
