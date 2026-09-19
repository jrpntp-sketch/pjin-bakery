import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "ร้านขนม — ต้นทุนและกำไรที่แท้จริง",
  description:
    "บันทึกรอบผลิต ต้นทุนจริงต่อชิ้น สต๊อก และกำไรขั้นต้น/สุทธิ — ข้อมูลเก็บในเครื่องคุณเอง",
  manifest: `${BASE}/manifest.json`,
  appleWebApp: {
    capable: true,
    title: "ร้านขนม",
    statusBarStyle: "default",
  },
  icons: {
    icon: `${BASE}/icon-192.png`,
    apple: `${BASE}/apple-touch-icon.png`,
  },
};

export const viewport: Viewport = {
  themeColor: "#fce7ea",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai+Looped:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
