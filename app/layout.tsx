import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import MotionProvider from "@/components/ui/MotionProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kamera Sekali Pakai",
  description:
    "Kamera digital sekali pakai untuk tamu pernikahan. Jepret sekarang, hasilnya dicuci setelah acara.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#110f0e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // Geist di-host sendiri lewat next/font/local (paket `geist`): tidak ada
    // permintaan ke Google Fonts, dan file font disajikan dari domain yang sama.
    <html lang="id" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
