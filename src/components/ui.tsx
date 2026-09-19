import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* ---------- Card ---------- */
export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-3xl border border-cream-200 bg-white shadow-sm ${className}`}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-cream-100 px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-[var(--page-accent)]">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

/* ---------- Stat ---------- */
export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "neutral" | "good" | "bad" | "warn";
}) {
  const toneClass = {
    neutral: "text-plum-700",
    good: "text-leaf-500",
    bad: "text-berry-500",
    warn: "text-peach-600",
  }[tone];
  return (
    <div className="rounded-3xl border border-cream-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-plum-400">{label}</p>
      <p className={`tabular mt-1 text-2xl font-bold ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-plum-400">{hint}</p>}
    </div>
  );
}

/* ---------- Button ---------- */
type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "ghost" | "danger";
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={`${buttonClass(variant)} ${className}`}
    />
  );
}

export function LinkButton({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: "primary" | "ghost" | "danger" }) {
  return <Link {...props} className={`${buttonClass(variant)} ${className}`} />;
}

function buttonClass(variant: "primary" | "ghost" | "danger") {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
  const variants = {
    primary: "bg-plum-600 text-cream-50 hover:bg-plum-700 active:scale-[0.98]",
    ghost:
      "border border-cream-200 bg-white text-plum-600 hover:bg-cream-100 active:scale-[0.98]",
    danger: "text-berry-500 hover:bg-berry-500/10 active:scale-[0.98]",
  };
  return `${base} ${variants[variant]}`;
}

/* ---------- Field ---------- */
export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-plum-600">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-plum-400">{hint}</span>}
    </label>
  );
}

/**
 * ช่องกรอกตัวเลข — ใช้ type="text" ไม่ใช่ "number"
 * เพราะ input[type=number] เลือกข้อความเดิมไม่ได้ (สเปค HTML)
 * ทำให้แตะแล้วพิมพ์กลายเป็นต่อท้าย เช่น 150 + 200 = "150200"
 * inputMode="decimal" ยังทำให้มือถือขึ้นแป้นตัวเลขเหมือนเดิม
 */
export const numberInput = {
  type: "text" as const,
  inputMode: "decimal" as const,
  autoComplete: "off",
  onFocus: (e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.select(),
};

export const inputClass =
  "w-full rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-sm text-plum-700 outline-none transition placeholder:text-plum-400/60 focus:border-sky-500 focus:ring-2 focus:ring-sky-400/30";

/* ---------- Empty state ---------- */
export function Empty({
  children,
  icon = "🧁",
}: {
  children: ReactNode;
  icon?: string;
}) {
  return (
    <div className="py-10 text-center">
      <p className="text-3xl">{icon}</p>
      <p className="mt-2 text-sm text-plum-400">{children}</p>
    </div>
  );
}

/* ---------- Badge ---------- */
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "bad" | "warn";
}) {
  const tones = {
    neutral: "bg-cream-100 text-plum-600",
    good: "bg-leaf-500/12 text-leaf-500",
    bad: "bg-berry-500/12 text-berry-500",
    warn: "bg-peach-500/15 text-peach-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/* ---------- Page header ---------- */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--page-accent)] sm:text-2xl">
            {title}
          </h1>
          {subtitle && <p className="mt-0.5 text-sm text-plum-400">{subtitle}</p>}
        </div>
        {action}
      </div>
      {/* ขอบหยักแบบลูกไม้ ใช้สีประจำหน้า */}
      <div className="scallop mt-3" aria-hidden="true" />
    </div>
  );
}
