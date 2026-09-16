import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminContext } from "@/lib/admin/access";
import EventForm from "@/components/admin/EventForm";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const context = await getAdminContext();
  // Pengantin tidak perlu tahu halaman ini ada.
  if (!context?.isPlatformAdmin) notFound();

  return (
    <main className="mx-auto min-h-dvh max-w-2xl p-4 sm:p-6">
      <Link
        href="/admin"
        className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/40 hover:text-film"
      >
        ← semua acara
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold">Acara baru</h1>
      <div className="rounded-2xl border border-cream/10 bg-shell-2/60 p-5 sm:p-6">
        <EventForm mode="create" />
      </div>
    </main>
  );
}
