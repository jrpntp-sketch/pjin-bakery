import { requireUser } from "@/lib/supabase/server";
import { groupTotals, sumTransactions } from "@/lib/queries";
import { money, num, monthStartISO, todayISO } from "@/lib/format";
import type { Expense, TransactionDetail } from "@/lib/types";
import { Card, Empty, PageHeader, Stat } from "@/components/ui";
import { RangePicker } from "./range-picker";

export const dynamic = "force-dynamic";

export default async function ReportsPage(props: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { supabase } = await requireUser();
  const sp = await props.searchParams;

  const from = sp.from || monthStartISO();
  const to = sp.to || todayISO();

  const [txRes, expRes] = await Promise.all([
    supabase
      .from("transaction_details")
      .select("*")
      .gte("sold_on", from)
      .lte("sold_on", to),
    supabase
      .from("expenses")
      .select("*")
      .gte("spent_on", from)
      .lte("spent_on", to),
  ]);

  const rows = (txRes.data ?? []) as TransactionDetail[];
  const expenses = (expRes.data ?? []) as Expense[];

  const totals = sumTransactions(rows);
  const otherExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const bottomLine = totals.net - otherExpenses;

  const byProduct = groupTotals(rows, "product_id", "product_name");
  const byChannel = groupTotals(rows, "channel_id", "channel_name");

  // ต้นทุนแฝงที่ "กำไรขั้นต้น" มองไม่เห็น
  const hiddenCost = totals.gross - totals.net;

  return (
    <>
      <PageHeader
        title="รายงาน"
        subtitle="ช่องว่างระหว่างกำไรขั้นต้นกับสุทธิ คือค่าแรงและค่าแฝงที่มักถูกลืม"
      />

      <RangePicker from={from} to={to} />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="ยอดขายรวม"
          value={money(totals.revenue)}
          hint={`${totals.orders} รายการ · ${num(totals.units)} ชิ้น`}
        />
        <Stat
          label="กำไรขั้นต้น"
          value={money(totals.gross)}
          hint="หักเฉพาะวัตถุดิบ"
        />
        <Stat
          label="กำไรสุทธิ"
          value={money(totals.net)}
          hint={`ถูกกินไป ${money(hiddenCost)} จากแรง+แฝง+ส่วนแบ่ง`}
          tone={totals.net > 0 ? "good" : totals.net < 0 ? "bad" : "neutral"}
        />
        <Stat
          label="เหลือจริง"
          value={money(bottomLine)}
          hint={`หลังหักรายจ่ายอื่น ${money(otherExpenses)}`}
          tone={bottomLine > 0 ? "good" : bottomLine < 0 ? "bad" : "neutral"}
        />
      </div>

      {rows.length === 0 ? (
        <Card>
          <Empty icon="📈">ช่วงเวลานี้ยังไม่มีรายการขาย</Empty>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <BreakdownCard
            title="แยกตามสินค้า"
            subtitle="เรียงจากกำไรสุทธิมากไปน้อย"
            rows={byProduct}
            unitLabel="ชิ้น"
          />
          <BreakdownCard
            title="แยกตามช่องทางขาย"
            subtitle="ที่ไหนคุ้มกว่ากัน"
            rows={byChannel}
            unitLabel="ชิ้น"
          />
        </div>
      )}
    </>
  );
}

function BreakdownCard({
  title,
  subtitle,
  rows,
  unitLabel,
}: {
  title: string;
  subtitle: string;
  rows: Array<{
    id: string;
    label: string;
    revenue: number;
    gross: number;
    net: number;
    units: number;
  }>;
  unitLabel: string;
}) {
  const max = Math.max(...rows.map((r) => Math.abs(r.gross)), 1);

  return (
    <Card title={title} action={<span className="text-xs text-cocoa-400">{subtitle}</span>}>
      <ul className="space-y-4">
        {rows.map((r) => {
          const grossPct = (Math.abs(r.gross) / max) * 100;
          const netPct = (Math.abs(r.net) / max) * 100;
          const margin = r.revenue > 0 ? (r.net / r.revenue) * 100 : 0;
          return (
            <li key={r.id}>
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-semibold text-cocoa-700">
                  {r.label}
                </p>
                <p className="tabular shrink-0 text-xs text-cocoa-400">
                  {num(r.units)} {unitLabel} · {money(r.revenue)}
                </p>
              </div>

              {/* แท่งเทียบ ขั้นต้น vs สุทธิ */}
              <div className="space-y-1">
                <Bar
                  label="ขั้นต้น"
                  value={money(r.gross)}
                  pct={grossPct}
                  className="bg-cocoa-400"
                />
                <Bar
                  label="สุทธิ"
                  value={money(r.net)}
                  pct={netPct}
                  className={r.net >= 0 ? "bg-mint-500" : "bg-berry-500"}
                />
              </div>

              <p
                className={`mt-1 text-xs font-medium ${
                  r.net < 0
                    ? "text-berry-500"
                    : margin < 15
                      ? "text-amber-600"
                      : "text-cocoa-400"
                }`}
              >
                {r.net < 0
                  ? "⚠️ ขาดทุนเมื่อคิดค่าแรง"
                  : margin < 15
                    ? `มาร์จิ้นสุทธิ ${margin.toFixed(0)}% — บาง`
                    : `มาร์จิ้นสุทธิ ${margin.toFixed(0)}%`}
              </p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Bar({
  label,
  value,
  pct,
  className,
}: {
  label: string;
  value: string;
  pct: number;
  className: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-xs text-cocoa-400">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream-100">
        <div
          className={`h-full rounded-full ${className}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span className="tabular w-20 shrink-0 text-right text-xs font-semibold text-cocoa-600">
        {value}
      </span>
    </div>
  );
}
