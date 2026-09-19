import type { NextConfig } from "next";

// deploy บน GitHub Pages ที่ /pjin-bakery — ตอน dev ใช้ path ว่าง
const basePath = process.env.NODE_ENV === "production" ? "/pjin-bakery" : "";

const nextConfig: NextConfig = {
  output: "export",          // static ล้วน ไม่มีเซิร์ฟเวอร์
  basePath,
  assetPrefix: basePath,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
