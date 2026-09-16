import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kamera Sekali Pakai",
  description:
    "Kamera digital sekali pakai untuk tamu pernikahan — jepret, hasilnya dicuci setelah acara.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#14110f",
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
    <html lang="id">
      {/* Font sistem: satu permintaan jaringan lebih sedikit di gedung
          resepsi yang sinyalnya pas-pasan, dan tidak ada flash of unstyled text. */}
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
