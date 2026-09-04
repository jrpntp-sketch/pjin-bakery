import { requireUser } from "@/lib/supabase/server";
import { todayISO } from "@/lib/format";
import type { Product } from "@/lib/types";
import { Card, Empty, LinkButton, PageHeader } from "@/components/ui";
import { BatchForm } from "./batch-form";

export const dynamic = "force-dynamic";

export default async function NewBatchPage(props: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const searchParams = await props.searchParams;

  const [productsRes, settingsRes] = await Promise.all([
    supabase.from("products").select("*").eq("is_active", true).order("name"),
    supabase
      .from("settings")
      .select("hourly_wage")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const products = (productsRes.data ?? []) as Product[];

  if (products.length === 0) {
    return (
      <>
        <PageHeader title="บันทึกรอบผลิต" />
        <Card>
          <Empty>
            ต้องมีสินค้าก่อนถึงจะบันทึกรอบผลิตได้
            <span className="mt-3 block">
              <LinkButton href="/products">ไปเพิ่มสินค้า</LinkButton>
            </span>
          </Empty>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="บันทึกรอบผลิต"
        subtitle="กรอกวัตถุดิบ เวลา และจำนวนที่ได้ — ระบบคิดต้นทุนจริงต่อชิ้นให้ทันที"
        action={
          <LinkButton href="/batches" variant="ghost">
            ดูรอบผลิตทั้งหมด
          </LinkButton>
        }
      />
      <BatchForm
        products={products}
        hourlyWage={Number(settingsRes.data?.hourly_wage ?? 0)}
        today={todayISO()}
        defaultProductId={searchParams.product}
      />
    </>
  );
}
