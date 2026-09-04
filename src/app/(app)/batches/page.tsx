import { requireUser } from "@/lib/supabase/server";
import { money, num, thaiDate } from "@/lib/format";
import type { Batch, Product } from "@/lib/types";
import { Card, Empty, LinkButton, PageHeader } from "@/components/ui";
import { DeleteBatchButton } from "./delete-button";

export const dynamic = "force-dynamic";

export default async function BatchesPage() {
  const { supabase } = await requireUser();

  const [batchesRes, productsRes] = await Promise.all([
    supabase
      .from("batches")
      .select("*")
      .order("produced_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("products").select("id, name, unit, base_price"),
  ]);

  const batches = (batchesRes.data ?? []) as Batch[];
  const products = new Map(
    ((productsRes.data ?? []) as Product[]).map((p) => [p.id, p]),
  );

  return (
    <>
      <PageHeader
        title="รอบผลิต"
        subtitle="ทุกครั้งที่ทำขนม บันทึกไว้ที่นี่ เพื่อให้ต้นทุนต่อชิ้นแม่นขึ้นเรื่อย ๆ"
        action={<LinkButton href="/batches/new">+ บันทึกรอบผลิต</LinkButton>}
      />

      <Card title={`ประวัติการผลิต (${batches.length} รอบล่าสุด)`}>
        {batches.length === 0 ? (
          <Empty icon="🧑‍🍳">
            ยังไม่มีรอบผลิต
            <span className="mt-3 block">
              <LinkButton href="/batches/new">บันทึกรอบแรก</LinkButton>
            </span>
          </Empty>
        ) : (
          <ul className="divide-y divide-cream-100">
            {batches.map((b) => {
              const p = products.get(b.product_id);
              const price = Number(p?.base_price ?? 0);
              const cost = Number(b.cost_per_unit);
              const netPerUnit = price - cost;
              return (
                <li key={b.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-cocoa-700">
                        {p?.name ?? "สินค้าที่ถูกลบ"}
                      </p>
                      <p className="tabular text-xs text-cocoa-400">
                        {thaiDate(b.produced_on)} · ได้ {num(b.qty_produced)}{" "}
                        {p?.unit ?? "ชิ้น"} · ใช้เวลา {num(b.hours_spent)} ชม.
                      </p>
                      <p className="tabular mt-1 text-xs text-cocoa-400">
                        วัตถุดิบ {money(b.material_cost)} · ค่าแรง{" "}
                        {money(b.labor_cost)} · แฝง {money(b.overhead_cost)} ={" "}
                        <span className="font-semibold text-cocoa-600">
                          {money(b.total_cost)}
                        </span>
                      </p>
                      {b.notes && (
                        <p className="mt-1 text-xs text-cocoa-400">{b.notes}</p>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="tabular text-base font-bold text-cocoa-700">
                        {money(cost)}
                      </p>
                      <p className="text-xs text-cocoa-400">ต้นทุน/หน่วย</p>
                      {price > 0 && (
                        <p
                          className={`tabular mt-1 text-xs font-semibold ${
                            netPerUnit >= 0 ? "text-mint-500" : "text-berry-500"
                          }`}
                        >
                          สุทธิ {money(netPerUnit)}/หน่วย
                        </p>
                      )}
                      <DeleteBatchButton id={b.id} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
