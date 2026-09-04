import { requireUser } from "@/lib/supabase/server";
import { money, num, thaiDate } from "@/lib/format";
import type { ProductStock, Product } from "@/lib/types";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { ProductForm, ProductRowActions } from "./product-form";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const { supabase } = await requireUser();

  const [productsRes, stockRes] = await Promise.all([
    supabase.from("products").select("*").order("name"),
    supabase.from("product_stock").select("*"),
  ]);

  const products = (productsRes.data ?? []) as Product[];
  const stockMap = new Map(
    ((stockRes.data ?? []) as ProductStock[]).map((s) => [s.product_id, s]),
  );

  return (
    <>
      <PageHeader
        title="สินค้า"
        subtitle="ราคาขายมาตรฐาน ใช้เป็นค่าตั้งต้นเวลาบันทึกขาย (แก้รายครั้งได้)"
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Card title={`รายการสินค้า (${products.length})`}>
          {products.length === 0 ? (
            <Empty>ยังไม่มีสินค้า — เพิ่มขนมชิ้นแรกทางขวาได้เลย</Empty>
          ) : (
            <ul className="divide-y divide-cream-100">
              {products.map((p) => {
                const s = stockMap.get(p.id);
                const stock = Number(s?.stock_qty ?? 0);
                const cost = Number(s?.avg_cost_per_unit ?? 0);
                const marginPct =
                  Number(p.base_price) > 0
                    ? ((Number(p.base_price) - cost) / Number(p.base_price)) * 100
                    : 0;
                return (
                  <li key={p.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-semibold text-cocoa-700">
                          {p.name}
                          {!p.is_active && <Badge>ปิดใช้งาน</Badge>}
                          {stock <= p.low_stock_threshold && p.is_active && (
                            <Badge tone={stock <= 0 ? "bad" : "warn"}>
                              เหลือ {num(stock)}
                            </Badge>
                          )}
                        </p>
                        <p className="tabular mt-1 text-xs text-cocoa-400">
                          ขาย {money(p.base_price)}/{p.unit} · ต้นทุนจริง{" "}
                          {cost > 0 ? money(cost) : "— ยังไม่มีรอบผลิต"}
                          {cost > 0 && (
                            <>
                              {" "}
                              ·{" "}
                              <span
                                className={
                                  marginPct < 20
                                    ? "font-semibold text-berry-500"
                                    : "font-semibold text-mint-500"
                                }
                              >
                                มาร์จิ้น {marginPct.toFixed(0)}%
                              </span>
                            </>
                          )}
                        </p>
                        <p className="text-xs text-cocoa-400">
                          สต๊อก {num(stock)} {p.unit} · ผลิตล่าสุด{" "}
                          {thaiDate(s?.last_produced_on)}
                        </p>
                        {p.notes && (
                          <p className="mt-1 text-xs text-cocoa-400">{p.notes}</p>
                        )}
                      </div>
                      <ProductRowActions product={p} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="lg:sticky lg:top-5 lg:self-start">
          <ProductForm />
        </div>
      </div>
    </>
  );
}
