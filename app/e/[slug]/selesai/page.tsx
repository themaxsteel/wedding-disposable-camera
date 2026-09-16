import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import PendingBadge from "@/components/camera/PendingBadge";
import type { EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FinishedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = createAdminClient();
  const { data: event, error } = await admin
    .from("events")
    .select("*")
    .eq("slug", slug)
    .maybeSingle<EventRow>();

  if (error) throw new Error(`Gagal memuat acara: ${error.message}`);
  if (!event) notFound();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center shell-texture safe-top safe-bottom">
      <div className="max-w-sm space-y-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-film/80">
          Rol film habis
        </p>
        <h1 className="text-2xl font-semibold">Terima kasih 🤍</h1>
        <p className="text-sm leading-relaxed text-cream/60">
          {event.film_limit} jepretanmu sudah tersimpan untuk {event.couple_names}.
          Hasilnya akan &ldquo;dicuci&rdquo; setelah acara selesai.
        </p>
        <PendingBadge />
      </div>
    </main>
  );
}
