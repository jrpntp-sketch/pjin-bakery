import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Lamoon ละมุน — ต้นทุนและกำไร",
  description:
    "จัดการต้นทุน บันทึกการผลิต สต็อกสินค้า และคำนวณกำไรสุทธิ (จัดเก็บข้อมูลในอุปกรณ์)",
  manifest: `${BASE}/manifest.json`,
  appleWebApp: {
    capable: true,
    title: "Lamoon",
    statusBarStyle: "default",
  },
  icons: {
    icon: `${BASE}/icon-192.png`,
    apple: `${BASE}/apple-touch-icon.png`,
  },
};

export const viewport: Viewport = {
  themeColor: "#f7e9d7",
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
          href="https://fonts.googleapis.com/css2?family=Mitr:wght@300;400;500;600&family=Chewy&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
