import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveGuestSession } from "@/lib/guest-session";
import { jsonError, jsonOk, mapRpcError } from "@/lib/api";
import { eventWindowState } from "@/lib/util/event-window";
import { MIN_SHOT_INTERVAL_MS, PHOTO_BUCKET } from "@/lib/env";
import type { PhotoRow } from "@/lib/types";

export const runtime = "nodejs";

const bodySchema = z.object({
  clientPhotoId: z.string().uuid(),
  takenAt: z.string().datetime().nullish(),
  facing: z.enum(["user", "environment"]).nullish(),
  source: z.enum(["camera", "upload"]).default("camera"),
  withFiltered: z.boolean().default(true),
  withThumbs: z.boolean().default(false),
});

type Variant = "orig" | "film" | "orig_thumb" | "film_thumb";

function objectPath(eventId: string, guestId: string, photoId: string, variant: Variant) {
  return `${eventId}/${guestId}/${photoId}_${variant}.jpg`;
}

export async function POST(request: NextRequest) {
  const session = await resolveGuestSession();
  if (!session) {
    return jsonError("SESI_TIDAK_VALID", "Sesi berakhir, masukkan nama lagi.", 401);
  }
  if (eventWindowState(session.event) !== "open") {
    return jsonError("EVENT_TUTUP", "Kamera sudah ditutup.", 403);
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("INPUT_TIDAK_VALID", "Permintaan tidak valid.", 400);
  }
  const { clientPhotoId, takenAt, facing, source, withFiltered, withThumbs } = parsed.data;

  const admin = createAdminClient();
  const { guest, event } = session;

  // Idempotensi: retry dari antrean offline TIDAK boleh memotong jatah film dua kali.
  const { data: existing } = await admin
    .from("photos")
    .select("*")
    .eq("guest_id", guest.id)
    .eq("client_photo_id", clientPhotoId)
    .maybeSingle<PhotoRow>();

  let photoId: string;
  let remaining: number;
  let rollLimit = event.film_limit;

  if (existing) {
    photoId = existing.id;
    const { data: fresh } = await admin
      .from("guests")
      .select("shots_used")
      .eq("id", guest.id)
      .single();
    remaining = Math.max(0, rollLimit - (fresh?.shots_used ?? guest.shots_used));
  } else {
    const { data: claim, error: claimError } = await admin
      .rpc("claim_shot", {
        p_guest: guest.id,
        p_min_interval_ms: MIN_SHOT_INTERVAL_MS,
      })
      .single<{ remaining: number; roll_limit: number }>();

    if (claimError || !claim) {
      const mapped = mapRpcError(claimError?.message ?? "");
      return jsonError(mapped.code, mapped.text, mapped.status);
    }
    remaining = claim.remaining;
    rollLimit = claim.roll_limit;

    // Id dibuat di sini supaya path storage sudah final pada satu insert.
    photoId = randomUUID();

    const { error: insertError } = await admin.from("photos").insert({
      id: photoId,
      event_id: event.id,
      guest_id: guest.id,
      storage_path: objectPath(event.id, guest.id, photoId, "orig"),
      filtered_path: withFiltered
        ? objectPath(event.id, guest.id, photoId, "film")
        : null,
      client_photo_id: clientPhotoId,
      taken_at: takenAt ?? new Date().toISOString(),
      facing: facing ?? null,
      source,
      status: "pending",
    });

    if (insertError) {
      return jsonError("GAGAL", "Gagal menyiapkan slot foto.", 500);
    }
  }

  const storage = admin.storage.from(PHOTO_BUCKET);

  const sign = async (variant: Variant, wanted: boolean) => {
    if (!wanted) return null;
    const path = objectPath(event.id, guest.id, photoId, variant);
    const { data, error } = await storage.createSignedUploadUrl(path, { upsert: true });
    return error || !data ? null : { path, token: data.token };
  };

  const [orig, film, origThumb, filmThumb] = await Promise.all([
    sign("orig", true),
    sign("film", withFiltered),
    sign("orig_thumb", withThumbs),
    sign("film_thumb", withThumbs && withFiltered),
  ]);

  if (!orig) {
    return jsonError("GAGAL", "Gagal membuat URL upload.", 500);
  }

  return jsonOk({ photoId, remaining, rollLimit, orig, film, origThumb, filmThumb });
}
