import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductStock, TransactionDetail } from "./types";
import { monthStartISO, todayISO } from "./format";

export type PeriodTotals = {
  revenue: number;
  gross: number;
  net: number;
  units: number;
  orders: number;
};

export function sumTransactions(rows: TransactionDetail[]): PeriodTotals {
  return rows.reduce<PeriodTotals>(
    (acc, t) => ({
      revenue: acc.revenue + Number(t.revenue),
      gross: acc.gross + Number(t.gross_profit),
      net: acc.net + Number(t.net_profit),
      units: acc.units + Number(t.qty),
      orders: acc.orders + 1,
    }),
    { revenue: 0, gross: 0, net: 0, units: 0, orders: 0 },
  );
}

/** จัดกลุ่มธุรกรรมตาม key แล้วรวมยอด */
export function groupTotals<K extends keyof TransactionDetail>(
  rows: TransactionDetail[],
  key: K,
  labelKey: keyof TransactionDetail,
): Array<PeriodTotals & { id: string; label: string }> {
  const map = new Map<string, PeriodTotals & { id: string; label: string }>();

  for (const t of rows) {
    const id = String(t[key]);
    const current = map.get(id) ?? {
      id,
      label: String(t[labelKey] ?? "—"),
      revenue: 0,
      gross: 0,
      net: 0,
      units: 0,
      orders: 0,
    };
    current.revenue += Number(t.revenue);
    current.gross += Number(t.gross_profit);
    current.net += Number(t.net_profit);
    current.units += Number(t.qty);
    current.orders += 1;
    map.set(id, current);
  }

  return [...map.values()].sort((a, b) => b.net - a.net);
}

/** ข้อมูลทั้งหมดที่หน้า Dashboard ต้องใช้ */
export async function getDashboardData(supabase: SupabaseClient) {
  const today = todayISO();
  const monthStart = monthStartISO();

  const [monthTx, stockRes, expenseRes] = await Promise.all([
    supabase
      .from("transaction_details")
      .select("*")
      .gte("sold_on", monthStart)
      .order("sold_on", { ascending: false }),
    supabase.from("product_stock").select("*").eq("is_active", true),
    supabase.from("expenses").select("amount").gte("spent_on", monthStart),
  ]);

  const monthRows = (monthTx.data ?? []) as TransactionDetail[];
  const todayRows = monthRows.filter((t) => t.sold_on === today);
  const stock = (stockRes.data ?? []) as ProductStock[];

  const monthExpenses = (expenseRes.data ?? []).reduce(
    (s, e) => s + Number(e.amount),
    0,
  );

  const lowStock = stock
    .filter((s) => Number(s.stock_qty) <= Number(s.low_stock_threshold))
    .sort((a, b) => Number(a.stock_qty) - Number(b.stock_qty));

  // สินค้าที่ "ไม่คุ้มแรง": กำไรสุทธิต่อชิ้น <= 0 หรือ margin สุทธิ < 10%
  const byProduct = groupTotals(monthRows, "product_id", "product_name");
  const unprofitable = byProduct
    .filter((p) => p.net <= 0 || (p.revenue > 0 && p.net / p.revenue < 0.1))
    .sort((a, b) => a.net - b.net);

  return {
    today: sumTransactions(todayRows),
    month: sumTransactions(monthRows),
    monthExpenses,
    lowStock,
    unprofitable,
    recent: monthRows.slice(0, 5),
    productCount: stock.length,
  };
}
