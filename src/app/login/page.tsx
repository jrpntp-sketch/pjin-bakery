import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "เข้าสู่ระบบ — ร้านขนม" };

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <main className="flex min-h-dvh items-center justify-center bg-cream-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-4xl">🧁</p>
          <h1 className="mt-3 text-2xl font-bold text-cocoa-700">
            ระบบจัดการร้านขนม
          </h1>
          <p className="mt-1 text-sm text-cocoa-400">
            ต้นทุนจริง กำไรจริง รวมค่าแรงและเวลาที่ลงไป
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
