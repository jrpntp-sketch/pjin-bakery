"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { openGuide } from "./guide";
import { LogoMark } from "./logo";
import { Emoji, withEmoji } from "./emoji";

const LINKS = [
  { href: "/", label: "ภาพรวม", icon: "🥐" },
  { href: "/batches", label: "รอบผลิต", icon: "🍩" },
  { href: "/sales", label: "ขาย/ฝาก", icon: "🥞" },
  { href: "/products", label: "สินค้า", icon: "🥨" },
  { href: "/channels", label: "ช่องทาง", icon: "🧁" },
  { href: "/expenses", label: "รายจ่าย", icon: "💸" },
  { href: "/reports", label: "รายงาน", icon: "🍰" },
] as const;

export function Sidebar({ shopName }: { shopName: string }) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-56 shrink-0 border-r border-cream-200 bg-white/85 backdrop-blur lg:block">
      <div className="sticky top-0 flex h-dvh flex-col">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <LogoMark className="size-10 shrink-0 rounded-full" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-plum-400">ร้าน</p>
            <p className="truncate text-base font-bold text-plum-700">
              {shopName}
            </p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {LINKS.map((l) => (
            <NavLink key={l.href} {...l} active={isActive(pathname, l.href)} />
          ))}
        </nav>
        <div className="space-y-0.5 border-t border-cream-100 p-3">
          <button
            type="button"
            onClick={openGuide}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-plum-400 transition hover:bg-cream-50 hover:text-plum-600"
          >
            <Emoji name="waffle" className="text-base" />
            คู่มือการใช้งาน
          </button>
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
    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-cream-200 bg-white/92 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {items.map((l) => {
        const active = isActive(pathname, l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${
              active ? "text-[var(--page-accent)]" : "text-plum-400"
            }`}
          >
            <span className="flex text-lg leading-none">{withEmoji(l.icon)}</span>
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
  href: string;
  label: string;
  icon: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-[var(--page-tint)] text-[var(--page-accent)]"
          : "text-plum-400 hover:bg-cream-100 hover:text-plum-600"
      }`}
    >
      <span className="flex text-base leading-none">{withEmoji(icon)}</span>
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
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-cream-200 bg-white/80 px-4 py-3 backdrop-blur lg:hidden">
      <div className="flex min-w-0 items-center gap-2">
        <LogoMark className="size-8 shrink-0 rounded-full" />
        <p className="truncate font-bold text-[var(--page-accent)]">{shopName}</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={openGuide}
          className="rounded-lg px-2 py-1 text-lg"
          aria-label="คู่มือการใช้งาน"
        >
          <Emoji name="waffle" className="size-5" />
        </button>
        <Link
          href="/reports"
          className="rounded-lg px-2 py-1 text-lg"
          aria-label="รายงาน"
        >
          <Emoji name="shortcake" className="size-5" />
        </Link>
        <Link
          href="/settings"
          className="rounded-lg px-2 py-1 text-lg"
          aria-label="ตั้งค่า"
        >
          <Emoji name="gear" className="size-5" />
        </Link>
      </div>
    </header>
  );
}
