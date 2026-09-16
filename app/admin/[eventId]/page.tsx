import { GearSixIcon, QrCodeIcon } from "@phosphor-icons/react/ssr";
import { notFound } from "next/navigation";
import { getEventAccess } from "@/lib/admin/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Gallery from "@/components/admin/Gallery";
import PageHeader from "@/components/admin/PageHeader";
import EventStatus from "@/components/admin/EventStatus";
import { LinkButton } from "@/components/ui/Button";
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
    <main className="mx-auto min-h-dvh max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        back={{ href: "/admin", label: "Semua acara" }}
        title={access.event.couple_names}
        meta={
          <>
            <EventStatus event={access.event} />
            <span>
              <b className="font-medium text-cream tabular-nums">{count ?? 0}</b> foto
            </span>
            <span>
              <b className="font-medium text-cream tabular-nums">{guests.length}</b> tamu
              memotret
            </span>
          </>
        }
        actions={
          <>
            <LinkButton
              href={`/admin/${eventId}/qr`}
              variant="secondary"
              icon={<QrCodeIcon className="size-4" aria-hidden />}
            >
              Cetak QR meja
            </LinkButton>
            {access.canManage ? (
              <LinkButton
                href={`/admin/${eventId}/pengaturan`}
                variant="secondary"
                icon={<GearSixIcon className="size-4" aria-hidden />}
              >
                Pengaturan
              </LinkButton>
            ) : null}
          </>
        }
      />

      <Gallery
        eventId={eventId}
        guests={guests}
        totalPhotos={count ?? 0}
        canManage={access.canManage}
      />
    </main>
  );
}
