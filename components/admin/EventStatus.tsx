import { eventWindowState } from "@/lib/util/event-window";
import type { EventRow } from "@/lib/types";

const LABEL = {
  open: { text: "Kamera terbuka", className: "text-ok border-ok/30 bg-ok/[0.08]" },
  belum_dibuka: { text: "Belum dibuka", className: "text-film border-film/30 bg-film/[0.08]" },
  sudah_tutup: { text: "Sudah ditutup", className: "text-cream/60 border-line-strong bg-cream/[0.03]" },
  nonaktif: { text: "Nonaktif", className: "text-cream/60 border-line-strong bg-cream/[0.03]" },
} as const;

/** Status kamera tamu saat halaman dimuat. */
export default function EventStatus({
  event,
}: {
  event: Pick<EventRow, "is_active" | "opens_at" | "closes_at">;
}) {
  const { text, className } = LABEL[eventWindowState(event)];
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {text}
    </span>
  );
}
