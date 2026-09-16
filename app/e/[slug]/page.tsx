import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveGuestSession } from "@/lib/guest-session";
import { eventWindowState } from "@/lib/util/event-window";
import NameForm from "@/components/guest/NameForm";
import CameraBody from "@/components/guest/CameraBody";
import type { EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";

const CLOSED_COPY: Record<string, { title: string; body: string }> = {
  belum_dibuka: {
    title: "Kameranya belum dibuka",
    body: "Coba scan lagi saat acara sudah dimulai ya 🤍",
  },
  sudah_tutup: {
    title: "Kameranya sudah ditutup",
    body: "Terima kasih sudah ikut memotret. Filmnya sedang dicuci.",
  },
  nonaktif: {
    title: "Kamera tidak aktif",
    body: "Hubungi panitia acara kalau ini tidak seharusnya terjadi.",
  },
};

export default async function GuestLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { slug } = await params;
  const { t } = await searchParams;

  const admin = createAdminClient();
  const { data: event, error } = await admin
    .from("events")
    .select("*")
    .eq("slug", slug)
    .maybeSingle<EventRow>();

  // Database bermasalah bukan berarti acaranya tidak ada — tamu tidak boleh
  // dikirim ke halaman 404 saat yang terjadi sebenarnya gangguan koneksi.
  if (error) throw new Error(`Gagal memuat acara: ${error.message}`);
  if (!event) notFound();

  const state = eventWindowState(event);
  if (state !== "open") {
    const copy = CLOSED_COPY[state];
    return (
      <main className="flex min-h-dvh items-center justify-center p-6 shell-texture">
        <div className="max-w-sm text-center">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-film/70">
            {event.couple_names}
          </p>
          <h1 className="mb-3 text-2xl font-semibold">{copy.title}</h1>
          <p className="text-sm text-cream/60">{copy.body}</p>
        </div>
      </main>
    );
  }

  // Tamu yang sudah punya sesi langsung masuk ke kamera — tidak perlu
  // mengetik nama ulang setiap kali scan QR di meja.
  const session = await resolveGuestSession();
  if (session && session.event.id === event.id) {
    redirect(`/e/${slug}/kamera`);
  }

  const tableLabel = t?.trim().slice(0, 40) || null;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-6 shell-texture safe-top safe-bottom">
      <CameraBody>
        <div className="mb-6 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-film/80">
            Kamera sekali pakai
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-cream">
            {event.couple_names}
          </h1>
          {tableLabel ? (
            <p className="mt-1 font-mono text-xs text-cream/50">{tableLabel}</p>
          ) : null}
        </div>

        {event.welcome_text ? (
          <p className="mb-6 text-center text-sm leading-relaxed text-cream/60">
            {event.welcome_text}
          </p>
        ) : null}

        <NameForm slug={event.slug} tableLabel={tableLabel} />
      </CameraBody>

      <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.25em] text-cream/25">
        {event.film_limit} exposures
      </p>
    </main>
  );
}
