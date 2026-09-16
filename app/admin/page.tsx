import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/admin/SignOutButton";
import type { EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const supabase = await createSupabaseServerClient();

  // RLS memastikan daftar ini hanya berisi acara milik user yang login.
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
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-film/80">
            Ruang cuci film
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Acara kamu</h1>
        </div>
        <SignOutButton />
      </div>

      {!events || events.length === 0 ? (
        <p className="rounded-xl border border-cream/10 bg-shell-2/60 p-6 text-sm text-cream/60">
          Belum ada acara yang terhubung ke akun ini. Tambahkan barisnya di tabel{" "}
          <code className="font-mono text-film">event_members</code> lewat Supabase.
        </p>
      ) : (
        <ul className="space-y-3">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/admin/${event.id}`}
                className="flex items-center justify-between rounded-xl border border-cream/10 bg-shell-2/60 p-5 transition hover:border-film/40"
              >
                <div>
                  <p className="text-lg font-medium">{event.couple_names}</p>
                  <p className="font-mono text-xs text-cream/40">
                    /e/{event.slug}
                    {event.event_date ? ` · ${event.event_date}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xl text-film tabular-nums">
                    {countMap.get(event.id) ?? 0}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-cream/40">
                    foto
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
