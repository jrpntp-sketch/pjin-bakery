import { requireUser } from "@/lib/supabase/server";
import type { Settings } from "@/lib/types";
import { Card, PageHeader } from "@/components/ui";
import { SettingsForm } from "./settings-form";
import { SignOutButton } from "./signout-button";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();

  const { data } = await supabase
    .from("settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const settings = (data ?? {
    user_id: user.id,
    shop_name: "ร้านขนม",
    currency: "THB",
    hourly_wage: 0,
  }) as Settings;

  return (
    <>
      <PageHeader
        title="ตั้งค่า"
        subtitle="ค่าแรงต่อชั่วโมงคือตัวแปรสำคัญที่สุด — มันทำให้ 'กำไรสุทธิ' มีความหมาย"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SettingsForm settings={settings} />

        <div className="space-y-4">
          <Card title="บัญชี">
            <p className="text-sm text-cocoa-600">{user.email}</p>
            <p className="mt-1 text-xs text-cocoa-400">
              ข้อมูลทั้งหมดผูกกับบัญชีนี้ เข้าจากเครื่องไหนก็เห็นข้อมูลเดียวกัน
            </p>
            <div className="mt-4">
              <SignOutButton />
            </div>
          </Card>

          <Card title="ระบบคิดต้นทุนยังไง">
            <div className="space-y-3 text-sm text-cocoa-600">
              <p>
                <span className="font-semibold text-cocoa-700">
                  ต้นทุนจริงต่อชิ้น
                </span>{" "}
                = (วัตถุดิบ + ค่าแรง + ค่าแฝง) ÷ จำนวนที่ได้ต่อรอบ
              </p>
              <p>
                <span className="font-semibold text-cocoa-700">กำไรขั้นต้น</span>{" "}
                = ยอดขาย − ต้นทุนวัตถุดิบ
                <span className="block text-xs text-cocoa-400">
                  ตัวเลขที่หลายคนคิดว่าเป็น &ldquo;กำไร&rdquo; แต่ยังไม่รวมแรงที่ลงไป
                </span>
              </p>
              <p>
                <span className="font-semibold text-cocoa-700">กำไรสุทธิ</span> =
                ยอดขาย − ต้นทุนจริงต่อชิ้น − ส่วนแบ่งช่องทาง − ค่าส่ง
                <span className="block text-xs text-cocoa-400">
                  ตัวเลขที่บอกว่าคุ้มค่าแรงจริงไหม
                </span>
              </p>
              <p className="rounded-xl bg-cream-50 p-3 text-xs text-cocoa-400">
                ค่าแรงจะถูกบันทึกติดไปกับแต่ละรอบผลิต ถ้าปรับค่าแรงวันนี้
                รอบผลิตเก่าจะไม่เปลี่ยนตาม — ประวัติกำไรจึงยังตรงกับความจริง
              </p>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
