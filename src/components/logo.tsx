const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** โลโก้เต็ม — ใช้ในหน้าโหลดและหัวคู่มือ */
export function Logo({ className = "" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${BASE}/logo.png`}
      alt="Lamoon ละมุน"
      width={632}
      height={640}
      className={className}
    />
  );
}

/** ไอคอนกลม ๆ เฉพาะตัวการ์ตูน — ใช้คู่กับชื่อร้านบนแถบหัว */
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${BASE}/icon-192.png`}
      alt=""
      width={192}
      height={192}
      aria-hidden="true"
      className={className}
    />
  );
}
