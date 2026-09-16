import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { GUEST_SESSION_HOURS } from "@/lib/env";
import type { EventRow, GuestRow } from "@/lib/types";

export const GUEST_COOKIE = "dc_session";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function guestCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GUEST_SESSION_HOURS * 60 * 60,
  };
}

/** Buat baris sesi baru; hanya hash-nya yang disimpan di database. */
export async function issueGuestSession(
  guestId: string,
  userAgent: string | null,
): Promise<string> {
  const admin = createAdminClient();
  const rawToken = randomBytes(32).toString("base64url");

  const { data, error } = await admin
    .from("guest_sessions")
    .insert({
      guest_id: guestId,
      token_hash: hashToken(rawToken),
      user_agent: userAgent?.slice(0, 300) ?? null,
      expires_at: new Date(
        Date.now() + GUEST_SESSION_HOURS * 60 * 60 * 1000,
      ).toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Gagal membuat sesi tamu: ${error?.message ?? "unknown"}`);
  }
  return `${data.id}.${rawToken}`;
}

export interface ResolvedGuestSession {
  sessionId: string;
  guest: GuestRow;
  event: EventRow;
}

/** Validasi cookie tamu. Mengembalikan null kalau tidak valid / kedaluwarsa. */
export async function resolveGuestSession(
  cookieValue?: string | null,
): Promise<ResolvedGuestSession | null> {
  const raw = cookieValue ?? (await cookies()).get(GUEST_COOKIE)?.value;
  if (!raw) return null;

  const sep = raw.indexOf(".");
  if (sep <= 0) return null;
  const sessionId = raw.slice(0, sep);
  const token = raw.slice(sep + 1);
  if (!token) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("guest_sessions")
    .select("id, token_hash, expires_at, guests(*, events(*))")
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !data) return null;
  if (new Date(data.expires_at) < new Date()) return null;

  // Bandingkan hash, bukan token mentah.
  if (data.token_hash !== hashToken(token)) return null;

  const guest = data.guests as unknown as (GuestRow & { events: EventRow }) | null;
  if (!guest || !guest.events) return null;

  const { events: event, ...guestRow } = guest;
  return { sessionId: data.id, guest: guestRow as GuestRow, event };
}
