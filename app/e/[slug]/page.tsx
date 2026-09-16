import { notFound, redirect } from "next/navigation";
import {
  CameraIcon,
  ClockIcon,
  FilmStripIcon,
  HourglassMediumIcon,
  ProhibitIcon,
  ImagesIcon,
} from "@phosphor-icons/react/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveGuestSession } from "@/lib/guest-session";
import { eventWindowState } from "@/lib/util/event-window";
import NameForm from "@/components/guest/NameForm";
import CameraBody from "@/components/guest/CameraBody";
import Reveal from "@/components/ui/Reveal";
import { Eyebrow } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/States";
import type { EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";

const CLOSED_COPY: Record<string, { title: string; body: string; icon: React.ReactNode }> = {
  belum_dibuka: {
    title: "Kameranya belum dibuka",
    body: "Scan lagi QR di meja saat acara sudah dimulai.",
    icon: <ClockIcon weight="duotone" />,
  },
  sudah_tutup: {
    title: "Kameranya sudah ditutup",
    body: "Terima kasih sudah ikut memotret. Filmnya sedang dicuci.",
    icon: <ImagesIcon weight="duotone" />,
  },
  nonaktif: {
    title: "Kamera tidak aktif",
    body: "Hubungi panitia acara kalau ini tidak seharusnya terjadi.",
    icon: <ProhibitIcon weight="duotone" />,
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

  // Database bermasalah bukan berarti acaranya tidak ada: tamu tidak boleh
  // dikirim ke halaman 404 saat yang terjadi sebenarnya gangguan koneksi.
  if (error) throw new Error(`Gagal memuat acara: ${error.message}`);
  if (!event) notFound();

  const state = eventWindowState(event);
  if (state !== "open") {
    const copy = CLOSED_COPY[state];
    return (
      <main className="shell-texture flex min-h-dvh flex-col justify-center px-5 py-10 safe-top safe-bottom">
        <div className="mx-auto w-full max-w-sm space-y-6">
          <Reveal>
            <p className="text-sm text-cream/55">{event.couple_names}</p>
          </Reveal>
          <Reveal index={1}>
            <EmptyState icon={copy.icon} title={copy.title}>
              {copy.body}
            </EmptyState>
          </Reveal>
        </div>
      </main>
    );
  }

  // Tamu yang sudah punya sesi langsung masuk ke kamera: tidak perlu
  // mengetik nama ulang setiap kali scan QR di meja.
  const session = await resolveGuestSession();
  if (session && session.event.id === event.id) {
    redirect(`/e/${slug}/kamera`);
  }

  const tableLabel = t?.trim().slice(0, 40) || null;

  const steps = [
    {
      icon: <CameraIcon weight="duotone" />,
      title: "Jepret dari browser",
      body: "Tanpa aplikasi. Pilih Izinkan saat HP meminta akses kamera.",
    },
    {
      icon: <FilmStripIcon weight="duotone" />,
      title: `Satu rol, ${event.film_limit} foto`,
      body: "Setiap jepretan mengurangi sisa film, jadi pilih momennya.",
    },
    {
      icon: <HourglassMediumIcon weight="duotone" />,
      title: "Dicuci setelah acara",
      body: `Hasilnya tidak bisa kamu lihat. Semua foto langsung dikirim ke ${event.couple_names}.`,
    },
  ];

  return (
    <main className="shell-texture min-h-dvh px-5 pt-8 pb-12 safe-top safe-bottom">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-8">
        <Reveal className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Eyebrow>Kamera sekali pakai</Eyebrow>
            {tableLabel ? (
              <span className="-rotate-2 rounded-md bg-cream px-2 py-0.5 font-mono text-xs font-medium text-shell shadow-(--shadow-press)">
                {tableLabel}
              </span>
            ) : null}
          </div>
          <h1 className="text-[2.5rem] leading-[1.05] font-semibold tracking-tight text-cream">
            {event.couple_names}
          </h1>
          {event.welcome_text ? (
            <p className="max-w-[38ch] text-[15px] leading-relaxed text-cream/65">
              {event.welcome_text}
            </p>
          ) : null}
        </Reveal>

        <Reveal index={1}>
          <CameraBody exposures={event.film_limit}>
            <NameForm slug={event.slug} tableLabel={tableLabel} />
          </CameraBody>
        </Reveal>

        <Reveal index={2}>
          <h2 className="mb-4 text-sm font-medium text-cream/55">Cara kerjanya</h2>
          <ol className="space-y-5">
            {steps.map((step) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-shell-2 text-film [&_svg]:size-5">
                  {step.icon}
                </span>
                <div className="pt-0.5">
                  <p className="text-[15px] font-medium text-cream">{step.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-cream/55">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </main>
  );
}
