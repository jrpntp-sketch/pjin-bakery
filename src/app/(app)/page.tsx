import { requireUser } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/queries";
import { money, num, thaiDate } from "@/lib/format";
import {
  Badge,
  Card,
  Empty,
  LinkButton,
  PageHeader,
  Stat,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { supabase } = await requireUser();
  const d = await getDashboardData(supabase);

  const monthAfterExpenses = d.month.net - d.monthExpenses;

  return (
    <>
      <PageHeader
        title="ภาพรวม"
        subtitle="กำไรขั้นต้นคือหลังหักวัตถุดิบ — กำไรสุทธิคือหลังหักค่าแรงและค่าแฝงด้วย"
        action={
          <div className="flex gap-2">
            <LinkButton href="/batches/new" variant="ghost">
              + รอบผลิต
            </LinkButton>
            <LinkButton href="/sales">+ บันทึกขาย</LinkButton>
          </div>
        }
      />

      {/* วันนี้ */}
      <h2 className="mb-2 text-sm font-semibold text-cocoa-400">วันนี้</h2>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="ยอดขาย" value={money(d.today.revenue)} />
        <Stat
          label="กำไรขั้นต้น"
          value={money(d.today.gross)}
          hint="หักเฉพาะวัตถุดิบ"
          tone={d.today.gross >= 0 ? "neutral" : "bad"}
        />
        <Stat
          label="กำไรสุทธิ"
          value={money(d.today.net)}
          hint="หักแรง + แฝง + ส่วนแบ่ง"
          tone={d.today.net > 0 ? "good" : d.today.net < 0 ? "bad" : "neutral"}
        />
        <Stat
          label="ขายได้"
          value={num(d.today.units)}
          hint={`${d.today.orders} รายการ`}
        />
      </div>

      {/* เดือนนี้ */}
      <h2 className="mb-2 text-sm font-semibold text-cocoa-400">เดือนนี้</h2>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="ยอดขาย" value={money(d.month.revenue)} />
        <Stat
          label="กำไรขั้นต้น"
          value={money(d.month.gross)}
          tone={d.month.gross >= 0 ? "neutral" : "bad"}
        />
        <Stat
          label="กำไรสุทธิ"
          value={money(d.month.net)}
          tone={d.month.net > 0 ? "good" : d.month.net < 0 ? "bad" : "neutral"}
        />
        <Stat
          label="เหลือจริงหลังรายจ่ายอื่น"
          value={money(monthAfterExpenses)}
          hint={`รายจ่ายอื่น ${money(d.monthExpenses)}`}
          tone={monthAfterExpenses > 0 ? "good" : monthAfterExpenses < 0 ? "bad" : "neutral"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* สินค้าไม่คุ้มแรง */}
        <Card
          title="⚠️ ทำแล้วไม่ค่อยคุ้มแรง (เดือนนี้)"
          action={
            <span className="text-xs text-cocoa-400">กำไรสุทธิต่ำ/ติดลบ</span>
          }
        >
          {d.unprofitable.length === 0 ? (
            <Empty icon="✨">
              เดือนนี้ทุกอย่างที่ขายไปคุ้มค่าแรงหมดเลย
            </Empty>
          ) : (
            <ul className="space-y-2.5">
              {d.unprofitable.slice(0, 6).map((p) => {
                const margin = p.revenue > 0 ? (p.net / p.revenue) * 100 : 0;
                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-cocoa-700">
                        {p.label}
                      </p>
                      <p className="tabular text-xs text-cocoa-400">
                        ขาย {num(p.units)} ชิ้น · ขั้นต้น {money(p.gross)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`tabular text-sm font-bold ${
                          p.net < 0 ? "text-berry-500" : "text-amber-600"
                        }`}
                      >
                        {money(p.net)}
                      </p>
                      <p className="tabular text-xs text-cocoa-400">
                        {margin.toFixed(0)}% มาร์จิ้น
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* สต๊อกใกล้หมด */}
        <Card
          title="📦 สต๊อกใกล้หมด"
          action={
            <LinkButton href="/batches/new" variant="ghost" className="!px-3 !py-1.5 !text-xs">
              ทำเพิ่ม
            </LinkButton>
          }
        >
          {d.productCount === 0 ? (
            <Empty>
              ยังไม่มีสินค้า — เริ่มที่{" "}
              <a href="/products" className="font-semibold underline">
                เพิ่มสินค้า
              </a>{" "}
              ก่อนนะ
            </Empty>
          ) : d.lowStock.length === 0 ? (
            <Empty icon="👍">สต๊อกทุกอย่างยังพอ</Empty>
          ) : (
            <ul className="space-y-2.5">
              {d.lowStock.slice(0, 6).map((s) => (
                <li
                  key={s.product_id}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-cocoa-700">
                      {s.name}
                    </p>
                    <p className="text-xs text-cocoa-400">
                      ผลิตล่าสุด {thaiDate(s.last_produced_on)}
                    </p>
                  </div>
                  <Badge tone={Number(s.stock_qty) <= 0 ? "bad" : "warn"}>
                    เหลือ {num(s.stock_qty)} {s.unit}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* รายการล่าสุด */}
      <Card
        title="รายการขายล่าสุด"
        className="mt-4"
        action={
          <LinkButton href="/reports" variant="ghost" className="!px-3 !py-1.5 !text-xs">
            ดูรายงาน
          </LinkButton>
        }
      >
        {d.recent.length === 0 ? (
          <Empty icon="🧾">เดือนนี้ยังไม่มีรายการขาย</Empty>
        ) : (
          <ul className="divide-y divide-cream-100">
            {d.recent.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-cocoa-700">
                    {t.product_name}{" "}
                    <span className="font-normal text-cocoa-400">
                      × {num(t.qty)}
                    </span>
                  </p>
                  <p className="text-xs text-cocoa-400">
                    {t.channel_name} · {thaiDate(t.sold_on)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular text-sm font-semibold text-cocoa-700">
                    {money(t.revenue)}
                  </p>
                  <p
                    className={`tabular text-xs font-medium ${
                      Number(t.net_profit) >= 0 ? "text-mint-500" : "text-berry-500"
                    }`}
                  >
                    สุทธิ {money(t.net_profit)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
