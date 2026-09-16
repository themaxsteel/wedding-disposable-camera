import { type NextRequest } from "next/server";
import { z } from "zod";
import { getEventAccess } from "@/lib/admin/access";
import { createAccessLink } from "@/lib/admin/accessLink";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, jsonOk } from "@/lib/api";
import type { EventMemberItem } from "@/lib/types";

export const runtime = "nodejs";

type Params = { params: Promise<{ eventId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const access = await getEventAccess(eventId);
  if (!access?.canManageMembers) {
    return jsonError("SESI_TIDAK_VALID", "Tidak punya izin mengelola anggota.", 403);
  }

  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("event_members")
    .select("user_id, role, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });
  if (error) return jsonError("GAGAL", "Gagal memuat anggota.", 500);

  const members: EventMemberItem[] = await Promise.all(
    (rows ?? []).map(async (row) => {
      const { data } = await admin.auth.admin.getUserById(row.user_id);
      return {
        userId: row.user_id,
        email: data.user?.email ?? null,
        role: row.role,
        pending: !data.user?.last_sign_in_at,
        isSelf: row.user_id === access.userId,
      };
    }),
  );

  return jsonOk({ members });
}

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Format email tidak valid."),
  role: z.enum(["owner", "editor", "viewer"]),
});

/** Undang anggota (atau buat ulang link untuk anggota yang sudah ada). */
export async function POST(request: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const access = await getEventAccess(eventId);
  if (!access?.canManageMembers) {
    return jsonError("SESI_TIDAK_VALID", "Tidak punya izin mengundang anggota.", 403);
  }

  const parsed = inviteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(
      "INPUT_TIDAK_VALID",
      parsed.error.issues[0]?.message ?? "Input tidak valid.",
      400,
    );
  }

  let link;
  try {
    link = await createAccessLink(parsed.data.email, new URL(request.url).origin);
  } catch {
    return jsonError("GAGAL", "Gagal membuat link undangan.", 500);
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("event_members")
    .upsert(
      { event_id: eventId, user_id: link.userId, role: parsed.data.role },
      { onConflict: "event_id,user_id" },
    );
  if (error) return jsonError("GAGAL", "Gagal menambahkan anggota.", 500);

  return jsonOk({ link: link.url, kind: link.kind, email: parsed.data.email });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const access = await getEventAccess(eventId);
  if (!access?.canManageMembers) {
    return jsonError("SESI_TIDAK_VALID", "Tidak punya izin mencabut anggota.", 403);
  }

  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId || !z.string().uuid().safeParse(userId).success) {
    return jsonError("INPUT_TIDAK_VALID", "Anggota tidak valid.", 400);
  }
  if (userId === access.userId) {
    // Mencegah owner mengunci dirinya sendiri keluar dari acara.
    return jsonError("INPUT_TIDAK_VALID", "Kamu tidak bisa mencabut aksesmu sendiri.", 400);
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("event_members")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", userId);
  if (error) return jsonError("GAGAL", "Gagal mencabut anggota.", 500);

  return jsonOk({ userId });
}
