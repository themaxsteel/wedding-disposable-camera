import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventAccess } from "@/lib/admin/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Gallery from "@/components/admin/Gallery";
import type { GuestSummaryRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EventDashboardPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const access = await getEventAccess(eventId);
  if (!access) notFound();

  const supabase = await createSupabaseServerClient();
  const { data: summary } = await supabase.rpc("event_guest_summary", {
    p_event: eventId,
  });

  const { count } = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", "ready");

  const guests = (summary ?? []) as GuestSummaryRow[];

  return (
    <main className="mx-auto min-h-dvh max-w-6xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin" className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/40 hover:text-film">
            ← semua acara
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{access.event.couple_names}</h1>
          <p className="font-mono text-xs text-cream/40">
            /e/{access.event.slug} · {count ?? 0} foto · {guests.length} tamu memotret
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {access.canManage ? (
            <Link
              href={`/admin/${eventId}/pengaturan`}
              className="rounded-lg border border-cream/15 px-3 py-2 text-xs text-cream/70 transition hover:border-film/40 hover:text-cream"
            >
              Pengaturan & undangan
            </Link>
          ) : null}
          <Link
            href={`/admin/${eventId}/qr`}
            className="rounded-lg border border-cream/15 px-3 py-2 text-xs text-cream/70 transition hover:border-film/40 hover:text-cream"
          >
            Cetak QR meja
          </Link>
        </div>
      </div>

      <Gallery
        eventId={eventId}
        guests={guests}
        totalPhotos={count ?? 0}
        canManage={access.canManage}
      />
    </main>
  );
}
