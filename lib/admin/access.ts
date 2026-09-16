import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventRow, MemberRole } from "@/lib/types";

export interface AdminContext {
  userId: string;
  email: string | null;
  isPlatformAdmin: boolean;
}

/** User yang sedang login + apakah dia admin platform GuestPro. */
export async function getAdminContext(): Promise<AdminContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");
  return {
    userId: user.id,
    email: user.email ?? null,
    isPlatformAdmin: isPlatformAdmin === true,
  };
}

export interface EventAccess extends AdminContext {
  event: EventRow;
  role: MemberRole | null;
  /** Ubah pengaturan acara & sembunyikan foto. */
  canManage: boolean;
  /** Undang / cabut anggota. */
  canManageMembers: boolean;
}

/**
 * Verifikasi bahwa user yang login boleh melihat acara ini.
 * Query jalan lewat client ber-RLS, jadi izin ditegakkan database —
 * bukan sekadar pengecekan di kode.
 */
export async function getEventAccess(eventId: string): Promise<EventAccess | null> {
  const context = await getAdminContext();
  if (!context) return null;

  const supabase = await createSupabaseServerClient();
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle<EventRow>();
  if (!event) return null;

  const [{ data: membership }, { data: canManage }, { data: canManageMembers }] =
    await Promise.all([
      supabase
        .from("event_members")
        .select("role")
        .eq("event_id", eventId)
        .eq("user_id", context.userId)
        .maybeSingle<{ role: MemberRole }>(),
      supabase.rpc("can_manage_event", { p_event: eventId }),
      supabase.rpc("can_manage_members", { p_event: eventId }),
    ]);

  return {
    ...context,
    event,
    role: membership?.role ?? null,
    canManage: canManage === true,
    canManageMembers: canManageMembers === true,
  };
}
