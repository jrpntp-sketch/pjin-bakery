"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ensureSeeded } from "@/lib/db";
import { requestPersistence } from "@/lib/backup";
import { useSettings } from "@/lib/hooks";
import { Sidebar, BottomNav, MobileHeader } from "./nav";
import { Guide } from "./guide";
import { Logo } from "./logo";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const pathname = usePathname();
  const settings = useSettings();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await ensureSeeded();
      } catch (e) {
        // ถ้าเปิดฐานข้อมูลไม่ได้ ต้องบอกผู้ใช้ ไม่ใช่ค้างหน้าโหลดเงียบ ๆ
        if (alive) setDbError(e instanceof Error ? e.message : String(e));
        return;
      }
      // ขอให้เบราว์เซอร์อย่าล้างข้อมูลทิ้ง — สำคัญมากบน iOS
      requestPersistence().catch(() => {});
      if (alive) setReady(true);
    })();

    // เวลาอัปเดตแอป ไฟล์ JS จะเปลี่ยนชื่อ (มี hash) แต่เบราว์เซอร์อาจยังถือ
    // HTML เก่าที่ชี้ไปไฟล์เดิมซึ่งไม่มีแล้ว ทำให้แอปเปิดไม่ขึ้น
    // ถ้าเจออาการนี้ ให้ล้าง cache แล้วโหลดใหม่ให้เองหนึ่งครั้ง
    const RELOAD_KEY = "pjin-chunk-reload";
    const onChunkError = async (ev: ErrorEvent | PromiseRejectionEvent) => {
      const err = "reason" in ev ? ev.reason : ev.error;
      const isChunkError =
        err?.name === "ChunkLoadError" ||
        /Loading chunk .* failed/i.test(String(err?.message ?? ""));
      if (!isChunkError) return;
      // กันวนลูป: ลองแค่ครั้งเดียวต่อการอัปเดตหนึ่งรอบ
      if (sessionStorage.getItem(RELOAD_KEY)) return;
      sessionStorage.setItem(RELOAD_KEY, "1");
      try {
        await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
        const regs = await navigator.serviceWorker?.getRegistrations?.();
        await Promise.all((regs ?? []).map((r) => r.unregister()));
      } catch {}
      location.reload();
    };
    window.addEventListener("error", onChunkError);
    window.addEventListener("unhandledrejection", onChunkError);
    // โหลดสำเร็จแล้วก็ล้างธงทิ้ง เผื่อมีอัปเดตรอบหน้า
    sessionStorage.removeItem(RELOAD_KEY);

    // ลงทะเบียน service worker เพื่อให้เปิดใช้ได้ตอนไม่มีเน็ต
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      navigator.serviceWorker.register(`${base}/sw.js`).catch(() => {});
    }
    return () => {
      alive = false;
      window.removeEventListener("error", onChunkError);
      window.removeEventListener("unhandledrejection", onChunkError);
    };
  }, []);

  if (dbError) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream-50 px-6">
        <div className="max-w-sm text-center">
          <Logo className="mx-auto w-32 opacity-60" />
          <h1 className="mt-4 text-lg font-bold text-plum-700">
            เปิดข้อมูลไม่ได้
          </h1>
          <p className="mt-2 text-sm text-plum-400">
            ไม่สามารถบันทึกข้อมูลได้ กรุณาปิดโหมดไม่ระบุตัวตน (Incognito)
            หรือตรวจสอบการอนุญาตจัดเก็บข้อมูลของเบราว์เซอร์
          </p>
          <p className="mt-3 rounded-xl bg-white px-3 py-2 text-left text-xs text-plum-400">
            {dbError}
          </p>
          <button
            type="button"
            onClick={() => location.reload()}
            className="mt-4 rounded-xl bg-plum-600 px-5 py-2.5 text-sm font-semibold text-cream-50"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream-50">
        <div className="text-center">
          <Logo className="mx-auto w-40 animate-pulse" />
          <p className="mt-3 text-sm text-plum-400">กำลังเปิดข้อมูล…</p>
        </div>
      </div>
    );
  }

  const shopName = settings?.shopName ?? "ร้านขนม";

  // ชุดสีของหน้านี้ — ประกาศไว้ใน globals.css เป็น [data-page="..."]
  const page =
    pathname === "/" ? "home"
    : pathname.startsWith("/batches") ? "batches"
    : pathname.startsWith("/sales") ? "sales"
    : pathname.startsWith("/products") ? "products"
    : pathname.startsWith("/channels") ? "channels"
    : pathname.startsWith("/expenses") ? "expenses"
    : pathname.startsWith("/reports") ? "reports"
    : "settings";

  return (
    <div data-page={page} className="plaid flex min-h-dvh bg-[var(--page-tint)]">
      <Sidebar shopName={shopName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader shopName={shopName} />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 pb-28 sm:px-6 lg:pb-8">
          {children}
        </main>
      </div>
      <BottomNav />
      <Guide />
    </div>
  );
}
