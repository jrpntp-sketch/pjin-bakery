import { requireUser } from "@/lib/supabase/server";
import { money } from "@/lib/format";
import type { Channel } from "@/lib/types";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { ChannelForm, ChannelRowActions } from "./channel-form";

export const dynamic = "force-dynamic";

const SHARE_LABEL = {
  none: "ได้เต็มราคา",
  percent: "หักส่วนแบ่ง %",
  fixed: "ราคาคงที่",
} as const;

export default async function ChannelsPage() {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("channels").select("*").order("name");
  const channels = (data ?? []) as Channel[];

  return (
    <>
      <PageHeader
        title="ช่องทางขาย"
        subtitle="ขายเอง ฝากร้าน หรือออกบูธ — แต่ละที่หักส่วนแบ่งไม่เท่ากัน"
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Card title={`ช่องทางทั้งหมด (${channels.length})`}>
          {channels.length === 0 ? (
            <Empty icon="🏪">ยังไม่มีช่องทาง — เพิ่มทางขวาได้เลย</Empty>
          ) : (
            <ul className="divide-y divide-cream-100">
              {channels.map((c) => (
                <li key={c.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-semibold text-cocoa-700">
                        {c.name}
                        {!c.is_active && <Badge>ปิดใช้งาน</Badge>}
                      </p>
                      <p className="tabular mt-1 text-xs text-cocoa-400">
                        {SHARE_LABEL[c.share_type]}
                        {c.share_type === "percent" &&
                          ` · หัก ${c.share_percent}% ของยอดขาย`}
                        {c.share_type === "fixed" &&
                          ` · ${money(c.fixed_price)} ต่อหน่วย`}
                        {Number(c.shipping_cost_per_trip) > 0 &&
                          ` · ค่าส่ง ${money(c.shipping_cost_per_trip)}/รอบ`}
                      </p>
                    </div>
                    <ChannelRowActions channel={c} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="lg:sticky lg:top-5 lg:self-start">
          <ChannelForm />
        </div>
      </div>
    </>
  );
}
