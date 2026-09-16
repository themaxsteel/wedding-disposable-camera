import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getEventAccess } from "@/lib/admin/access";
import PageHeader from "@/components/admin/PageHeader";
import PrintButton from "@/components/admin/PrintButton";
import Button from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";

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
    <main className="mx-auto min-h-dvh max-w-6xl px-4 py-10 sm:px-6 print:max-w-none print:p-0">
      <PageHeader
        back={{ href: `/admin/${eventId}`, label: "Galeri" }}
        title="QR untuk meja tamu"
        meta={
          <span className="font-mono text-xs break-all">
            {origin}/e/{access.event.slug}
          </span>
        }
        actions={
          <form className="flex items-end gap-2">
            <div>
              <Label htmlFor="tables">Jumlah meja</Label>
              <Input
                id="tables"
                type="number"
                name="tables"
                min={1}
                max={60}
                defaultValue={count}
                className="w-24 font-mono tabular-nums"
              />
            </div>
            <Button type="submit" variant="secondary">
              Perbarui
            </Button>
            <PrintButton />
          </form>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2 print:gap-0">
        {codes.map((code) => (
          <div
            key={code.label}
            className="flex break-inside-avoid flex-col items-center rounded-2xl bg-[#fbf8f3] p-7 text-center text-shell print:rounded-none print:border print:border-dashed print:border-neutral-400"
          >
            <p className="text-xs font-medium text-shell/55">Kamera sekali pakai</p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-balance">
              {access.event.couple_names}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={code.dataUrl} alt={`QR ${code.label}`} className="my-5 size-44" />
            <p className="rounded-md bg-shell px-2.5 py-1 font-mono text-sm font-medium text-cream">
              {code.label}
            </p>
            <p className="mt-3 text-xs text-shell/60">
              Scan untuk memotret. Hasilnya langsung ke pengantin.
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
