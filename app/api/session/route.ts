import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { guestCookieOptions, GUEST_COOKIE, issueGuestSession } from "@/lib/guest-session";
import { cleanDisplayName, toNameKey } from "@/lib/util/name";
import { eventWindowState } from "@/lib/util/event-window";
import { jsonError } from "@/lib/api";
import type { EventRow, GuestRow, GuestSessionInfo } from "@/lib/types";

export const runtime = "nodejs";

const bodySchema = z.object({
  slug: z.string().min(1).max(80),
  name: z.string().min(2).max(40),
  tableLabel: z.string().max(40).nullish(),
  deviceId: z.string().min(8).max(64),
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("INPUT_TIDAK_VALID", "Nama minimal 2 karakter.", 400);
  }

  const displayName = cleanDisplayName(parsed.data.name);
  const nameKey = toNameKey(displayName);
  if (nameKey.length < 2) {
    return jsonError("INPUT_TIDAK_VALID", "Nama minimal 2 karakter.", 400);
  }

  const admin = createAdminClient();

  const { data: event, error: eventError } = await admin
    .from("events")
    .select("*")
    .eq("slug", parsed.data.slug)
    .maybeSingle<EventRow>();

  if (eventError) {
    return jsonError("GAGAL", "Server sedang bermasalah, coba lagi.", 503);
  }
  if (!event) {
    return jsonError("INPUT_TIDAK_VALID", "Acara tidak ditemukan.", 404);
  }
  if (eventWindowState(event) !== "open") {
    return jsonError("EVENT_TUTUP", "Kamera belum/sudah tidak dibuka.", 403);
  }

  // Satu tamu = (acara, nama, device). Tamu yang kembali melanjutkan rol filmnya,
  // bukan mendapat jatah baru.
  const { data: guest, error: guestError } = await admin
    .from("guests")
    .upsert(
      {
        event_id: event.id,
        display_name: displayName,
        name_key: nameKey,
        table_label: parsed.data.tableLabel?.slice(0, 40) ?? null,
        device_id: parsed.data.deviceId,
      },
      { onConflict: "event_id,name_key,device_id" },
    )
    .select("*")
    .single<GuestRow>();

  if (guestError || !guest) {
    return jsonError("GAGAL", "Gagal menyiapkan kamera.", 500);
  }

  const cookieValue = await issueGuestSession(
    guest.id,
    request.headers.get("user-agent"),
  );

  const info: GuestSessionInfo = {
    guestId: guest.id,
    displayName: guest.display_name,
    tableLabel: guest.table_label,
    shotsUsed: guest.shots_used,
    filmLimit: event.film_limit,
    remaining: Math.max(0, event.film_limit - guest.shots_used),
    filmPreset: event.film_preset,
    eventSlug: event.slug,
    coupleNames: event.couple_names,
  };

  const response = NextResponse.json({ ok: true, session: info });
  response.cookies.set(GUEST_COOKIE, cookieValue, guestCookieOptions());
  return response;
}
