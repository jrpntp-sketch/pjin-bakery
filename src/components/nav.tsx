"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "ภาพรวม", icon: "📊" },
  { href: "/batches", label: "รอบผลิต", icon: "🧑‍🍳" },
  { href: "/sales", label: "ขาย/ฝาก", icon: "🧾" },
  { href: "/products", label: "สินค้า", icon: "🧁" },
  { href: "/channels", label: "ช่องทาง", icon: "🏪" },
  { href: "/expenses", label: "รายจ่าย", icon: "💸" },
  { href: "/reports", label: "รายงาน", icon: "📈" },
] as const;

export function Sidebar({ shopName }: { shopName: string }) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-56 shrink-0 border-r border-cream-200 bg-white lg:block">
      <div className="sticky top-0 flex h-dvh flex-col">
        <div className="px-5 py-5">
          <p className="text-xs font-medium text-cocoa-400">ร้าน</p>
          <p className="truncate text-base font-bold text-cocoa-700">
            {shopName}
          </p>
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {LINKS.map((l) => (
            <NavLink key={l.href} {...l} active={isActive(pathname, l.href)} />
          ))}
        </nav>
        <div className="border-t border-cream-100 p-3">
          <NavLink
            href="/settings"
            label="ตั้งค่า"
            icon="⚙️"
            active={isActive(pathname, "/settings")}
          />
        </div>
      </div>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const items = [...LINKS.slice(0, 5)];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-cream-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {items.map((l) => {
        const active = isActive(pathname, l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${
              active ? "text-cocoa-700" : "text-cocoa-400"
            }`}
          >
            <span className="text-lg leading-none">{l.icon}</span>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

function NavLink({
  href,
  label,
  icon,
  active,
}: {
  href: Route;
  label: string;
  icon: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-cream-100 text-cocoa-700"
          : "text-cocoa-400 hover:bg-cream-50 hover:text-cocoa-600"
      }`}
    >
      <span className="text-base leading-none">{icon}</span>
      {label}
    </Link>
  );
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** แถบหัวสำหรับจอมือถือ */
export function MobileHeader({ shopName }: { shopName: string }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-cream-200 bg-cream-50/95 px-4 py-3 backdrop-blur lg:hidden">
      <p className="truncate font-bold text-cocoa-700">{shopName}</p>
      <div className="flex items-center gap-1">
        <Link
          href="/reports"
          className="rounded-lg px-2 py-1 text-lg"
          aria-label="รายงาน"
        >
          📈
        </Link>
        <Link
          href="/settings"
          className="rounded-lg px-2 py-1 text-lg"
          aria-label="ตั้งค่า"
        >
          ⚙️
        </Link>
      </div>
    </header>
  );
}
