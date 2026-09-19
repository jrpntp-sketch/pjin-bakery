"use client";

import { db } from "@/lib/db";
import { useBatches } from "@/lib/hooks";
import { money, num, thaiDate } from "@/lib/format";
import { Card, Empty, LinkButton, PageHeader } from "@/components/ui";

export default function BatchesPage() {
  const batches = useBatches();

  if (!batches) return <div className="h-40 animate-pulse rounded-2xl bg-cream-100" />;

  return (
    <>
      <PageHeader title="รอบผลิต"
        subtitle="ทุกครั้งที่ทำขนม บันทึกไว้ที่นี่ เพื่อให้ต้นทุนต่อชิ้นแม่นขึ้นเรื่อย ๆ"
        action={<LinkButton href="/batches/new">+ บันทึกรอบผลิต</LinkButton>} />

      <Card title={`ประวัติการผลิต (${batches.length} รอบล่าสุด)`}>
        {batches.length === 0 ? (
          <Empty icon="🧑‍🍳">
            ยังไม่มีรอบผลิต
            <span className="mt-3 block"><LinkButton href="/batches/new">บันทึกรอบแรก</LinkButton></span>
          </Empty>
        ) : (
          <ul className="divide-y divide-cream-100">
            {batches.map((b) => {
              const price = b.product?.basePrice ?? 0;
              const netPerUnit = price - b.costPerUnit;
              return (
                <li key={b.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-cocoa-700">
                        {b.product?.name ?? "สินค้าที่ถูกลบ"}
                      </p>
                      <p className="tabular text-xs text-cocoa-400">
                        {thaiDate(b.producedOn)} · ได้ {num(b.qtyProduced)} {b.product?.unit ?? "ชิ้น"}
                        {" · ใช้เวลา "}{num(b.hoursSpent)} ชม.
                      </p>
                      <p className="tabular mt-1 text-xs text-cocoa-400">
                        วัตถุดิบ {money(b.materialCost)} · ค่าแรง {money(b.laborCost)} · แฝง{" "}
                        {money(b.overheadCost)} ={" "}
                        <span className="font-semibold text-cocoa-600">{money(b.totalCost)}</span>
                      </p>
                      {b.materials && b.materials.length > 0 && (
                        <p className="mt-1 text-xs text-cocoa-400">
                          {b.materials.map((m) => `${m.name} ${money(m.cost)}`).join(" · ")}
                        </p>
                      )}
                      {b.notes && <p className="mt-1 text-xs text-cocoa-400">{b.notes}</p>}
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="tabular text-base font-bold text-cocoa-700">{money(b.costPerUnit)}</p>
                      <p className="text-xs text-cocoa-400">ต้นทุน/หน่วย</p>
                      {price > 0 && (
                        <p className={`tabular mt-1 text-xs font-semibold ${
                          netPerUnit >= 0 ? "text-leaf-500" : "text-berry-500"}`}>
                          สุทธิ {money(netPerUnit)}/หน่วย
                        </p>
                      )}
                      <button type="button"
                        onClick={async () => {
                          if (confirm("ลบรอบผลิตนี้? สต๊อกและต้นทุนเฉลี่ยจะถูกคำนวณใหม่")) {
                            await db.batches.delete(b.id);
                          }
                        }}
                        className="mt-1 rounded-lg px-2 py-1 text-xs font-semibold text-cocoa-400 transition hover:bg-berry-500/10 hover:text-berry-500">
                        ลบ
                      </button>
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
