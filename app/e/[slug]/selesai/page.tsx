import { notFound } from "next/navigation";
import { FilmReelIcon } from "@phosphor-icons/react/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import PendingBadge from "@/components/camera/PendingBadge";
import Reveal from "@/components/ui/Reveal";
import RollWind from "@/components/guest/RollWind";
import { Eyebrow } from "@/components/ui/Panel";
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
    <main className="shell-texture flex min-h-dvh flex-col px-5 pt-8 pb-10 safe-top safe-bottom">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8">
        <RollWind>
          <FilmReelIcon className="size-14 text-film" weight="duotone" aria-hidden />
        </RollWind>

        <Reveal index={1} className="space-y-3">
          <Eyebrow>Rol film habis</Eyebrow>
          <h1 className="text-[2.25rem] leading-[1.08] font-semibold tracking-tight">
            Terima kasih sudah memotret
          </h1>
          <p className="max-w-[36ch] text-[15px] leading-relaxed text-cream/65">
            {event.film_limit} jepretanmu tersimpan untuk{" "}
            <span className="text-cream">{event.couple_names}</span>. Hasilnya dicuci setelah
            acara selesai.
          </p>
        </Reveal>

        <Reveal index={2}>
          <PendingBadge />
        </Reveal>
      </div>
    </main>
  );
}
