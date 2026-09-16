import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getEventAccess } from "@/lib/admin/access";

export const dynamic = "force-dynamic";

async function siteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export default async function QrPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ tables?: string }>;
}) {
  const { eventId } = await params;
  const { tables } = await searchParams;
  const access = await getEventAccess(eventId);
  if (!access) notFound();

  const count = Math.min(60, Math.max(1, Number(tables ?? "10") || 10));
  const origin = await siteOrigin();

  const codes = await Promise.all(
    Array.from({ length: count }, async (_, index) => {
      const label = `Meja ${index + 1}`;
      const url = `${origin}/e/${access.event.slug}?t=${encodeURIComponent(label)}`;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 640,
        margin: 1,
        errorCorrectionLevel: "M",
        color: { dark: "#14110f", light: "#ffffff" },
      });
      return { label, url, dataUrl };
    }),
  );

  return (
    <main className="mx-auto min-h-dvh max-w-5xl p-6 print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <Link
            href={`/admin/${eventId}`}
            className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/40 hover:text-film"
          >
            ← dashboard
          </Link>
          <h1 className="mt-2 text-xl font-semibold">QR untuk meja tamu</h1>
          <p className="text-xs text-cream/40">{origin}/e/{access.event.slug}</p>
        </div>

        <form className="flex items-end gap-2">
          <label className="text-xs text-cream/50">
            Jumlah meja
            <input
              type="number"
              name="tables"
              min={1}
              max={60}
              defaultValue={count}
              className="mt-1 block w-24 rounded-lg border border-cream/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-film/60"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg border border-cream/15 px-3 py-2 text-xs text-cream/70 hover:border-film/50"
          >
            Perbarui
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-4 print:grid-cols-2 print:gap-0">
        {codes.map((code) => (
          <div
            key={code.label}
            className="flex break-inside-avoid flex-col items-center rounded-xl border border-cream/15 bg-white p-6 text-center text-shell print:rounded-none print:border-dashed"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-grime">
              Kamera sekali pakai
            </p>
            <p className="mt-1 text-lg font-semibold">{access.event.couple_names}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={code.dataUrl} alt={`QR ${code.label}`} className="my-4 h-44 w-44" />
            <p className="text-sm font-medium">{code.label}</p>
            <p className="mt-1 text-[11px] text-grime">
              Scan untuk memotret — hasilnya langsung ke pengantin
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
