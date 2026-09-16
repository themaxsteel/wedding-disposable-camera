import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/admin/SignOutButton";
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
    <main className="mx-auto min-h-dvh max-w-3xl p-6">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-film/80">
            Ruang cuci film{context.isPlatformAdmin ? " · admin GuestPro" : ""}
          </p>
          <h1 className="mt-2 text-2xl font-semibold">
            {context.isPlatformAdmin ? "Semua acara" : "Acara kamu"}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {context.isPlatformAdmin ? (
            <Link
              href="/admin/acara-baru"
              className="rounded-lg bg-film px-3 py-2 text-xs font-semibold text-shell"
            >
              + Acara baru
            </Link>
          ) : null}
          <Link
            href="/admin/akun"
            className="rounded-lg border border-cream/15 px-3 py-2 text-xs text-cream/60 transition hover:border-film/40 hover:text-cream"
          >
            Akun
          </Link>
          <SignOutButton />
        </div>
      </div>

      {dihapus ? (
        <p role="status" className="mb-4 rounded-xl border border-teal/50 bg-teal/15 p-4 text-sm">
          Acara <b>{dihapus.slice(0, 80)}</b> beserta semua fotonya sudah dihapus.
        </p>
      ) : null}

      {!events || events.length === 0 ? (
        <p className="rounded-xl border border-cream/10 bg-shell-2/60 p-6 text-sm text-cream/60">
          {context.isPlatformAdmin
            ? "Belum ada acara. Klik “+ Acara baru” untuk membuat yang pertama."
            : "Belum ada acara yang terhubung ke akun ini. Minta link undangan ke admin GuestPro."}
        </p>
      ) : (
        <ul className="space-y-3">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/admin/${event.id}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-cream/10 bg-shell-2/60 p-5 transition hover:border-film/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-lg font-medium">
                    {event.couple_names}
                    {!event.is_active ? (
                      <span className="ml-2 align-middle font-mono text-[10px] uppercase tracking-wider text-cream/40">
                        nonaktif
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate font-mono text-xs text-cream/40">
                    /e/{event.slug}
                    {event.event_date ? ` · ${event.event_date}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xl text-film tabular-nums">
                    {countMap.get(event.id) ?? 0}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-cream/40">foto</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
