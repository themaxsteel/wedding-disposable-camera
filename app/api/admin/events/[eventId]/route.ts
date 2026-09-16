import { type NextRequest } from "next/server";
import { getEventAccess } from "@/lib/admin/access";
import { eventInputSchema, firstIssue, toEventRow } from "@/lib/admin/eventInput";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/api";

export const runtime = "nodejs";

/** Ubah pengaturan acara — admin platform, owner, atau editor. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const access = await getEventAccess(eventId);
  if (!access?.canManage) {
    return jsonError("SESI_TIDAK_VALID", "Tidak punya izin mengubah acara ini.", 403);
  }

  const parsed = eventInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("INPUT_TIDAK_VALID", firstIssue(parsed.error), 400);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("events")
    .update(toEventRow(parsed.data))
    .eq("id", eventId);

  if (error) {
    if (error.code === "23505") {
      return jsonError("INPUT_TIDAK_VALID", "Slug itu sudah dipakai acara lain.", 409);
    }
    return jsonError("GAGAL", "Gagal menyimpan pengaturan.", 500);
  }

  return jsonOk({ eventId, slug: parsed.data.slug });
}
