import { notFound } from "next/navigation";
import { getAdminContext } from "@/lib/admin/access";
import EventForm from "@/components/admin/EventForm";
import PageHeader from "@/components/admin/PageHeader";
import { Panel } from "@/components/ui/Panel";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const context = await getAdminContext();
  // Pengantin tidak perlu tahu halaman ini ada.
  if (!context?.isPlatformAdmin) notFound();

  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader
        back={{ href: "/admin", label: "Semua acara" }}
        title="Acara baru"
        meta={<span>Pengantin bisa diundang setelah acara dibuat.</span>}
      />
      <Panel>
        <EventForm mode="create" />
      </Panel>
    </main>
  );
}
