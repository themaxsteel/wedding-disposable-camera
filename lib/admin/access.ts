import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventRow } from "@/lib/types";

export interface EventAccess {
  userId: string;
  event: EventRow;
}

/**
 * Verifikasi bahwa user yang login memang anggota event ini.
 * Query jalan lewat client ber-RLS, jadi keanggotaan ditegakkan database —
 * bukan sekadar pengecekan di kode.
 */
export async function getEventAccess(eventId: string): Promise<EventAccess | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle<EventRow>();

  if (!event) return null;
  return { userId: user.id, event };
}
