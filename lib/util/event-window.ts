import type { EventRow } from "@/lib/types";

export type EventWindowState = "open" | "belum_dibuka" | "sudah_tutup" | "nonaktif";

export function eventWindowState(
  event: Pick<EventRow, "is_active" | "opens_at" | "closes_at">,
  now: Date = new Date(),
): EventWindowState {
  if (!event.is_active) return "nonaktif";
  if (event.opens_at && now < new Date(event.opens_at)) return "belum_dibuka";
  if (event.closes_at && now > new Date(event.closes_at)) return "sudah_tutup";
  return "open";
}

export function isEventOpen(
  event: Pick<EventRow, "is_active" | "opens_at" | "closes_at">,
  now: Date = new Date(),
): boolean {
  return eventWindowState(event, now) === "open";
}
