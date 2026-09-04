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
      className={`rounded-2xl border border-cream-200 bg-white shadow-sm ${className}`}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-cream-100 px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-cocoa-700">{title}</h2>
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
    neutral: "text-cocoa-700",
    good: "text-mint-500",
    bad: "text-berry-500",
    warn: "text-amber-600",
  }[tone];
  return (
    <div className="rounded-2xl border border-cream-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-cocoa-400">{label}</p>
      <p className={`tabular mt-1 text-2xl font-bold ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-cocoa-400">{hint}</p>}
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
    primary: "bg-cocoa-600 text-cream-50 hover:bg-cocoa-700 active:scale-[0.98]",
    ghost:
      "border border-cream-200 bg-white text-cocoa-600 hover:bg-cream-100 active:scale-[0.98]",
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
      <span className="mb-1.5 block text-xs font-semibold text-cocoa-600">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-cocoa-400">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-sm text-cocoa-700 outline-none transition placeholder:text-cocoa-400/60 focus:border-cocoa-400 focus:ring-2 focus:ring-cocoa-400/20";

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
      <p className="mt-2 text-sm text-cocoa-400">{children}</p>
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
    neutral: "bg-cream-100 text-cocoa-600",
    good: "bg-mint-500/12 text-mint-500",
    bad: "bg-berry-500/12 text-berry-500",
    warn: "bg-amber-500/15 text-amber-700",
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
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-cocoa-700 sm:text-2xl">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-cocoa-400">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
