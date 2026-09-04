"use client";

import { useActionState } from "react";
import { saveSettings } from "@/lib/actions/settings";
import type { FormState } from "@/lib/actions/products";
import type { Settings } from "@/lib/types";
import { Button, Card, Field, inputClass } from "@/components/ui";

const EMPTY: FormState = {};

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, formAction, pending] = useActionState(saveSettings, EMPTY);

  return (
    <Card title="ข้อมูลร้าน">
      <form action={formAction} className="space-y-3.5">
        <Field label="ชื่อร้าน">
          <input
            name="shop_name"
            required
            defaultValue={settings.shop_name}
            className={inputClass}
          />
        </Field>

        <Field
          label="ค่าแรงของตัวเอง ต่อชั่วโมง (บาท)"
          hint="ตีราคาเวลาตัวเองเท่าไหร่? ลองเทียบกับค่าจ้างงานอื่นที่ทำได้ในเวลาเท่ากัน"
        >
          <input
            name="hourly_wage"
            type="number"
            step="1"
            min="0"
            inputMode="decimal"
            defaultValue={settings.hourly_wage}
            placeholder="เช่น 150"
            className={inputClass}
          />
        </Field>

        <input type="hidden" name="currency" value="THB" />

        {state.error && (
          <p className="rounded-xl bg-berry-500/10 px-3 py-2 text-sm text-berry-500">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p className="rounded-xl bg-mint-500/10 px-3 py-2 text-sm text-mint-500">
            บันทึกแล้ว ✓ รอบผลิตใหม่จะใช้ค่าแรงนี้
          </p>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "กำลังบันทึก…" : "บันทึกการตั้งค่า"}
        </Button>
      </form>
    </Card>
  );
}
