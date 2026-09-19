"use client";

import { useEffect, useState } from "react";
import { ensureSeeded } from "@/lib/db";
import { requestPersistence } from "@/lib/backup";
import { useSettings } from "@/lib/hooks";
import { Sidebar, BottomNav, MobileHeader } from "./nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const settings = useSettings();

  useEffect(() => {
    let alive = true;
    (async () => {
      await ensureSeeded();
      // ขอให้เบราว์เซอร์อย่าล้างข้อมูลทิ้ง — สำคัญมากบน iOS
      requestPersistence().catch(() => {});
      if (alive) setReady(true);
    })();

    // ลงทะเบียน service worker เพื่อให้เปิดใช้ได้ตอนไม่มีเน็ต
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      navigator.serviceWorker.register(`${base}/sw.js`).catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream-50">
        <div className="text-center">
          <p className="animate-pulse text-4xl">🧁</p>
          <p className="mt-3 text-sm text-cocoa-400">กำลังเปิดข้อมูล…</p>
        </div>
      </div>
    );
  }

  const shopName = settings?.shopName ?? "ร้านขนม";

  return (
    <div className="flex min-h-dvh bg-cream-50">
      <Sidebar shopName={shopName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader shopName={shopName} />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 pb-28 sm:px-6 lg:pb-8">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
