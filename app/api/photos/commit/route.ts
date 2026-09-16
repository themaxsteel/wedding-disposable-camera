import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveGuestSession } from "@/lib/guest-session";
import { jsonError, jsonOk } from "@/lib/api";

export const runtime = "nodejs";

const bodySchema = z.object({
  photoId: z.string().uuid(),
  caption: z.string().max(200).nullish(),
  width: z.number().int().positive().max(20000).nullish(),
  height: z.number().int().positive().max(20000).nullish(),
  bytes: z.number().int().positive().max(20_000_000).nullish(),
  filteredUploaded: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  const session = await resolveGuestSession();
  if (!session) {
    return jsonError("SESI_TIDAK_VALID", "Sesi berakhir.", 401);
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("INPUT_TIDAK_VALID", "Permintaan tidak valid.", 400);
  }
  const { photoId, caption, width, height, bytes, filteredUploaded } = parsed.data;

  const admin = createAdminClient();
  const update: Record<string, unknown> = {
    status: "ready",
    caption: caption?.trim() ? caption.trim().slice(0, 200) : null,
    width: width ?? null,
    height: height ?? null,
    bytes: bytes ?? null,
  };
  if (!filteredUploaded) update.filtered_path = null;

  const { error } = await admin
    .from("photos")
    .update(update)
    .eq("id", photoId)
    .eq("guest_id", session.guest.id); // foto orang lain tidak bisa disentuh

  if (error) {
    return jsonError("GAGAL", "Gagal menyimpan foto.", 500);
  }
  return jsonOk({ photoId });
}
