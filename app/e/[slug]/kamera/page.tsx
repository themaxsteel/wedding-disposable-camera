import { redirect } from "next/navigation";
import { resolveGuestSession } from "@/lib/guest-session";
import { eventWindowState } from "@/lib/util/event-window";
import CameraView from "@/components/camera/CameraView";
import type { GuestSessionInfo } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CameraPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await resolveGuestSession();

  // Sesi hilang / kedaluwarsa / milik acara lain → kembali isi nama.
  if (!session || session.event.slug !== slug) {
    redirect(`/e/${slug}`);
  }
  if (eventWindowState(session.event) !== "open") {
    redirect(`/e/${slug}`);
  }

  const remaining = Math.max(
    0,
    session.event.film_limit - session.guest.shots_used,
  );
  if (remaining <= 0) {
    redirect(`/e/${slug}/selesai`);
  }

  const info: GuestSessionInfo = {
    guestId: session.guest.id,
    displayName: session.guest.display_name,
    tableLabel: session.guest.table_label,
    shotsUsed: session.guest.shots_used,
    filmLimit: session.event.film_limit,
    remaining,
    filmPreset: session.event.film_preset,
    eventSlug: session.event.slug,
    coupleNames: session.event.couple_names,
  };

  return <CameraView session={info} />;
}
