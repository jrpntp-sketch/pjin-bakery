import { requireUser } from "@/lib/supabase/server";
import { money, num, thaiDate, todayISO } from "@/lib/format";
import type { Channel, ProductStock, TransactionDetail } from "@/lib/types";
import { Card, Empty, LinkButton, PageHeader } from "@/components/ui";
import { SaleForm } from "./sale-form";
import { DeleteSaleButton } from "./delete-button";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const { supabase } = await requireUser();

  const [stockRes, channelsRes, txRes] = await Promise.all([
    supabase.from("product_stock").select("*").eq("is_active", true).order("name"),
    supabase.from("channels").select("*").eq("is_active", true).order("name"),
    supabase
      .from("transaction_details")
      .select("*")
      .order("sold_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const stock = (stockRes.data ?? []) as ProductStock[];
  const channels = (channelsRes.data ?? []) as Channel[];
  const transactions = (txRes.data ?? []) as TransactionDetail[];

  const missing =
    stock.length === 0
      ? { label: "สินค้า", href: "/products" as const }
      : channels.length === 0
        ? { label: "ช่องทางขาย", href: "/channels" as const }
        : null;

  return (
    <>
      <PageHeader
        title="บันทึกขาย / ฝากขาย"
        subtitle="เลือกสินค้ากับช่องทาง ระบบตัดสต๊อกและคิดกำไรให้อัตโนมัติ"
      />

      {missing ? (
        <Card>
          <Empty>
            ต้องมี{missing.label}ก่อนถึงจะบันทึกขายได้
            <span className="mt-3 block">
              <LinkButton href={missing.href}>ไปเพิ่ม{missing.label}</LinkButton>
            </span>
          </Empty>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
          <div className="lg:sticky lg:top-5 lg:self-start">
            <SaleForm stock={stock} channels={channels} today={todayISO()} />
          </div>

          <Card title="รายการล่าสุด">
            {transactions.length === 0 ? (
              <Empty icon="🧾">ยังไม่มีรายการขาย</Empty>
            ) : (
              <ul className="divide-y divide-cream-100">
                {transactions.map((t) => (
                  <li key={t.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-cocoa-700">
                          {t.product_name}{" "}
                          <span className="font-normal text-cocoa-400">
                            × {num(t.qty)}
                          </span>
                        </p>
                        <p className="text-xs text-cocoa-400">
                          {t.channel_name} · {thaiDate(t.sold_on)} ·{" "}
                          {money(t.unit_price)}/{t.product_unit}
                        </p>
                        <p className="tabular mt-1 text-xs text-cocoa-400">
                          ต้นทุน {money(Number(t.unit_full_cost) * Number(t.qty))}
                          {Number(t.channel_share) > 0 &&
                            ` · ส่วนแบ่ง ${money(t.channel_share)}`}
                          {Number(t.delivery_cost) > 0 &&
                            ` · ค่าส่ง ${money(t.delivery_cost)}`}
                        </p>
                        {t.notes && (
                          <p className="mt-1 text-xs text-cocoa-400">{t.notes}</p>
                        )}
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="tabular font-semibold text-cocoa-700">
                          {money(t.revenue)}
                        </p>
                        <p className="tabular text-xs text-cocoa-400">
                          ขั้นต้น {money(t.gross_profit)}
                        </p>
                        <p
                          className={`tabular text-xs font-bold ${
                            Number(t.net_profit) >= 0
                              ? "text-mint-500"
                              : "text-berry-500"
                          }`}
                        >
                          สุทธิ {money(t.net_profit)}
                        </p>
                        <DeleteSaleButton id={t.id} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
