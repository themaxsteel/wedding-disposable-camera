import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center shell-texture">
      <div className="max-w-md space-y-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-film/80">
          GuestPro
        </p>
        <h1 className="text-3xl font-semibold">Kamera Digital Sekali Pakai</h1>
        <p className="text-sm leading-relaxed text-cream/60">
          Tamu memindai QR di meja, mengetik nama, lalu memotret. Hasilnya mengalir
          langsung ke pengantin — tanpa unduh aplikasi, tanpa galeri yang bisa diintip.
        </p>
        <Link
          href="/admin"
          className="inline-block rounded-lg border border-cream/15 px-4 py-2 text-sm text-cream/70 transition hover:border-film/50 hover:text-cream"
        >
          Masuk dashboard
        </Link>
      </div>
    </main>
  );
}
