import { notFound } from "next/navigation";
import { getEventAccess } from "@/lib/admin/access";
import EventForm from "@/components/admin/EventForm";
import MembersPanel from "@/components/admin/MembersPanel";
import DeleteEventPanel from "@/components/admin/DeleteEventPanel";
import PageHeader from "@/components/admin/PageHeader";
import { Notice, Panel } from "@/components/ui/Panel";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EventSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ baru?: string }>;
}) {
  const { eventId } = await params;
  const { baru } = await searchParams;
  const access = await getEventAccess(eventId);
  if (!access?.canManage) notFound();

  const { event } = access;

  // Hitungan untuk peringatan hapus: semua status, termasuk foto tersembunyi.
  let photoCount = 0;
  let guestCount = 0;
  if (access.isPlatformAdmin) {
    const supabase = await createSupabaseServerClient();
    const [photos, guests] = await Promise.all([
      supabase.from("photos").select("id", { count: "exact", head: true }).eq("event_id", eventId),
      supabase.from("guests").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    ]);
    photoCount = photos.count ?? 0;
    guestCount = guests.count ?? 0;
  }

  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader
        back={{ href: `/admin/${eventId}`, label: "Galeri" }}
        title="Pengaturan acara"
        meta={
          <>
            <span className="text-cream">{event.couple_names}</span>
            <span className="font-mono text-xs">/e/{event.slug}</span>
          </>
        }
      />

      <div className="space-y-10">
        {baru ? (
          <Notice tone="ok" title="Acara dibuat">
            Langkah berikutnya: undang pengantin di bagian bawah, lalu cetak QR meja dari halaman
            galeri.
          </Notice>
        ) : null}

        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Detail acara</h2>
          <Panel>
            <EventForm mode="edit" event={event} />
          </Panel>
        </section>

        {access.canManageMembers ? (
          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">Siapa yang bisa melihat foto</h2>
              <p className="text-sm text-cream/55">
                Undangan berupa link yang kamu kirim sendiri, misalnya lewat WhatsApp.
              </p>
            </div>
            <Panel>
              <MembersPanel eventId={eventId} coupleNames={event.couple_names} />
            </Panel>
          </section>
        ) : null}

        {access.isPlatformAdmin ? (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight text-danger">Hapus acara</h2>
            <Panel tone="danger">
              <DeleteEventPanel
                eventId={eventId}
                slug={event.slug}
                coupleNames={event.couple_names}
                photoCount={photoCount}
                guestCount={guestCount}
              />
            </Panel>
          </section>
        ) : null}
      </div>
    </main>
  );
}
