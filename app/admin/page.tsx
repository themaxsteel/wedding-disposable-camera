import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CalendarBlankIcon, CaretRightIcon, PlusIcon } from "@phosphor-icons/react/ssr";
import PageHeader from "@/components/admin/PageHeader";
import EventStatus from "@/components/admin/EventStatus";
import { LinkButton } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/States";
import type { EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ dihapus?: string }>;
}) {
  const { dihapus } = await searchParams;
  const context = await getAdminContext();
  if (!context) redirect("/admin/login");

  const supabase = await createSupabaseServerClient();

  // RLS: admin platform melihat semua acara, anggota hanya acara tempat dia diundang.
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<EventRow[]>();

  const counts = await Promise.all(
    (events ?? []).map(async (event) => {
      const { count } = await supabase
        .from("photos")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .eq("status", "ready");
      return { id: event.id, count: count ?? 0 };
    }),
  );
  const countMap = new Map(counts.map((item) => [item.id, item.count]));

  return (
    <main className="mx-auto min-h-dvh max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title={context.isPlatformAdmin ? "Semua acara" : "Acara kamu"}
        meta={
          context.isPlatformAdmin ? (
            <span>Kamu masuk sebagai admin platform</span>
          ) : (
            <span>Pilih acara untuk melihat foto dari para tamu</span>
          )
        }
        actions={
          context.isPlatformAdmin ? (
            <LinkButton
              href="/admin/acara-baru"
              icon={<PlusIcon className="size-4" weight="bold" aria-hidden />}
            >
              Acara baru
            </LinkButton>
          ) : null
        }
      />

      {dihapus ? (
        <Notice tone="ok" className="mb-6">
          Acara <b className="text-cream">{dihapus.slice(0, 80)}</b> beserta semua fotonya sudah
          dihapus.
        </Notice>
      ) : null}

      {!events || events.length === 0 ? (
        <EmptyState
          icon={<CalendarBlankIcon weight="duotone" />}
          title="Belum ada acara"
          action={
            context.isPlatformAdmin ? (
              <LinkButton
                href="/admin/acara-baru"
                icon={<PlusIcon className="size-4" weight="bold" aria-hidden />}
              >
                Buat acara pertama
              </LinkButton>
            ) : null
          }
        >
          {context.isPlatformAdmin
            ? "Acara yang kamu buat muncul di sini, lengkap dengan jumlah fotonya."
            : "Belum ada acara yang terhubung ke akun ini. Minta link undangan ke admin."}
        </EmptyState>
      ) : (
        <ul className="grid gap-3">
          {events.map((event) => {
            const photos = countMap.get(event.id) ?? 0;
            return (
              <li key={event.id}>
                <Link
                  href={`/admin/${event.id}`}
                  className="group grid grid-cols-[1fr_auto] items-center gap-6 rounded-2xl border border-line bg-shell-2/70 px-5 py-5 transition duration-200 hover:border-film/40 hover:bg-shell-2 sm:px-6"
                >
                  <div className="min-w-0 space-y-2">
                    <p className="truncate text-xl font-semibold tracking-tight">
                      {event.couple_names}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-cream/55">
                      <EventStatus event={event} />
                      {event.event_date ? <span>{formatDate(event.event_date)}</span> : null}
                      <span className="font-mono text-xs text-cream/45">/e/{event.slug}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-mono text-2xl font-medium text-film tabular-nums">
                        {photos}
                      </p>
                      <p className="text-xs text-cream/50">foto</p>
                    </div>
                    <CaretRightIcon
                      className="size-5 text-cream/30 transition duration-200 group-hover:translate-x-0.5 group-hover:text-film"
                      aria-hidden
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
