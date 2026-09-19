import type { ReactNode } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * อิโมจิชุด Twemoji เก็บเป็นไฟล์ในแอป (ไม่ต้องต่อเน็ต)
 * ใช้แทนอิโมจิของระบบ เพราะแต่ละเครื่อง/ระบบปฏิบัติการวาดไม่เหมือนกัน
 * ของ Apple กับ Android คนละแบบ พี่จินกับเราจะเห็นไม่ตรงกัน
 */
const MAP: Record<string, string> = {
  "🧁": "cupcake",
  "🧑‍🍳": "cook",
  "🧾": "receipt",
  "📦": "package",
  "🏪": "store",
  "💸": "money-wings",
  "📈": "chart-up",
  "📊": "bar-chart",
  "💾": "floppy",
  "📱": "phone",
  "💡": "bulb",
  "📌": "pushpin",
  "🧪": "test-tube",
  "✨": "sparkles",
  "👍": "thumbs-up",
  "⚠️": "warning",
  "⚠": "warning",
  "❓": "question",
  "⚙️": "gear",
  "⚙": "gear",
  "⬇": "arrow-down",
  "⬆": "arrow-up",
};

// เรียงจากยาวไปสั้น เพื่อให้ ⚠️ (มี FE0F) ถูกจับก่อน ⚠ เปล่า ๆ
const CHARS = Object.keys(MAP).sort((a, b) => b.length - a.length);
const PATTERN = new RegExp(
  `(${CHARS.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
  "g",
);

export function Emoji({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${BASE}/emoji/${name}.svg`}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`inline-block size-[1.15em] shrink-0 translate-y-[0.1em] select-none ${className}`}
    />
  );
}

/**
 * แทนอิโมจิที่อยู่ในข้อความด้วยรูป โดยไม่ต้องไปแก้ทุกจุดที่เขียนข้อความ
 * ส่งอะไรมาก็ได้ — ถ้าไม่ใช่ข้อความจะคืนกลับไปตามเดิม
 */
export function withEmoji(node: ReactNode): ReactNode {
  if (typeof node !== "string") return node;
  if (!PATTERN.test(node)) {
    PATTERN.lastIndex = 0;
    return node;
  }
  PATTERN.lastIndex = 0;

  return node.split(PATTERN).map((part, i) =>
    MAP[part] ? <Emoji key={i} name={MAP[part]} /> : part,
  );
}

/** ใช้ครอบข้อความใน JSX ที่มีอิโมจิปนอยู่ */
export function T({ children }: { children: string }) {
  return <>{withEmoji(children)}</>;
}
