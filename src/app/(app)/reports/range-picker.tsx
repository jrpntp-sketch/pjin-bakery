"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { inputClass } from "@/components/ui";

const PRESETS = [
  { label: "7 วัน", days: 7 },
  { label: "30 วัน", days: 30 },
  { label: "90 วัน", days: 90 },
] as const;

export function RangePicker({ from, to }: { from: string; to: string }) {
  const router = useRouter();

  const go = (nextFrom: string, nextTo: string) =>
    router.push(`/reports?from=${nextFrom}&to=${nextTo}`);

  const preset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    go(iso(start), iso(end));
  };

  const thisMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    go(iso(start), iso(now));
  };

  return (
    <Card className="mb-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1">
          <span className="mb-1.5 block text-xs font-semibold text-cocoa-600">
            ตั้งแต่
          </span>
          <input
            type="date"
            value={from}
            onChange={(e) => go(e.target.value, to)}
            className={inputClass}
          />
        </label>
        <label className="flex-1">
          <span className="mb-1.5 block text-xs font-semibold text-cocoa-600">
            ถึง
          </span>
          <input
            type="date"
            value={to}
            onChange={(e) => go(from, e.target.value)}
            className={inputClass}
          />
        </label>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={thisMonth}
            className="rounded-xl border border-cream-200 px-3 py-2.5 text-xs font-semibold text-cocoa-600 transition hover:bg-cream-100"
          >
            เดือนนี้
          </button>
          {PRESETS.map((p) => (
            <button
              key={p.days}
              type="button"
              onClick={() => preset(p.days)}
              className="rounded-xl border border-cream-200 px-3 py-2.5 text-xs font-semibold text-cocoa-600 transition hover:bg-cream-100"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}

function iso(d: Date) {
  return d.toLocaleDateString("en-CA");
}
