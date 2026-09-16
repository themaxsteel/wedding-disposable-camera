import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventAccess } from "@/lib/admin/access";
import EventForm from "@/components/admin/EventForm";
import MembersPanel from "@/components/admin/MembersPanel";

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

  return (
    <main className="mx-auto min-h-dvh max-w-2xl space-y-8 p-4 sm:p-6">
      <div>
        <Link
          href={`/admin/${eventId}`}
          className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/40 hover:text-film"
        >
          ← galeri
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{event.couple_names}</h1>
        <p className="font-mono text-xs text-cream/40">Pengaturan acara · /e/{event.slug}</p>
      </div>

      {baru ? (
        <div className="rounded-xl border border-teal/50 bg-teal/15 p-4 text-sm">
          <p className="font-medium">Acara dibuat ✓</p>
          <p className="mt-1 text-cream/60">
            Langkah berikutnya: undang pengantin di bagian bawah, lalu cetak QR meja dari
            halaman galeri.
          </p>
        </div>
      ) : null}

      {access.canManageMembers ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Siapa yang bisa melihat foto</h2>
            <p className="text-sm text-cream/50">
              Undangan berupa link yang kamu kirim sendiri, misalnya lewat WhatsApp.
            </p>
          </div>
          <div className="rounded-2xl border border-cream/10 bg-shell-2/60 p-5 sm:p-6">
            <MembersPanel eventId={eventId} coupleNames={event.couple_names} />
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Detail acara</h2>
        <div className="rounded-2xl border border-cream/10 bg-shell-2/60 p-5 sm:p-6">
          <EventForm mode="edit" event={event} />
        </div>
      </section>
    </main>
  );
}
