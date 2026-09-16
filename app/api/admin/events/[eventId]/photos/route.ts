import { type NextRequest } from "next/server";
import { getEventAccess } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, jsonOk } from "@/lib/api";
import { GALLERY_PAGE_SIZE, PHOTO_BUCKET, SIGNED_URL_TTL_SECONDS } from "@/lib/env";
import type { AdminPhotoItem, PhotoStatus } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const access = await getEventAccess(eventId);
  if (!access) {
    return jsonError("SESI_TIDAK_VALID", "Tidak punya akses ke acara ini.", 403);
  }

  const url = new URL(request.url);
  const nameKey = url.searchParams.get("guest");
  const variant = url.searchParams.get("variant") === "film" ? "film" : "orig";
  const cursor = url.searchParams.get("cursor");
  const includeHidden = url.searchParams.get("hidden") === "1";

  const admin = createAdminClient();

  let query = admin
    .from("photos")
    .select(
      "id, storage_path, filtered_path, caption, taken_at, created_at, status, guests!inner(display_name, name_key, table_label)",
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(GALLERY_PAGE_SIZE);

  query = includeHidden
    ? query.in("status", ["ready", "hidden"])
    : query.eq("status", "ready");

  if (nameKey) query = query.eq("guests.name_key", nameKey);
  if (cursor) query = query.lt("created_at", cursor);

  const { data, error } = await query;
  if (error) {
    return jsonError("GAGAL", error.message, 500);
  }

  type Row = {
    id: string;
    storage_path: string;
    filtered_path: string | null;
    caption: string | null;
    taken_at: string | null;
    created_at: string;
    status: PhotoStatus;
    guests: { display_name: string; name_key: string; table_label: string | null };
  };
  const rows = (data ?? []) as unknown as Row[];

  // Bucket privat: setiap foto butuh signed URL. Dibuat sekaligus satu batch.
  const paths = rows.map((row) =>
    variant === "film" && row.filtered_path ? row.filtered_path : row.storage_path,
  );

  const signedMap = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await admin.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
    for (const item of signed ?? []) {
      if (item.signedUrl && item.path) signedMap.set(item.path, item.signedUrl);
    }
  }

  const items: AdminPhotoItem[] = rows.map((row, index) => ({
    id: row.id,
    guestName: row.guests.display_name,
    tableLabel: row.guests.table_label,
    caption: row.caption,
    takenAt: row.taken_at,
    createdAt: row.created_at,
    status: row.status,
    url: signedMap.get(paths[index]) ?? null,
    hasFilm: row.filtered_path !== null,
  }));

  return jsonOk({
    items,
    nextCursor: rows.length === GALLERY_PAGE_SIZE ? rows[rows.length - 1].created_at : null,
  });
}

/** Sembunyikan / tampilkan kembali sebuah foto. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const access = await getEventAccess(eventId);
  if (!access) {
    return jsonError("SESI_TIDAK_VALID", "Tidak punya akses ke acara ini.", 403);
  }

  const body = (await request.json().catch(() => null)) as {
    photoId?: string;
    status?: string;
  } | null;

  if (!body?.photoId || !["ready", "hidden"].includes(body.status ?? "")) {
    return jsonError("INPUT_TIDAK_VALID", "Permintaan tidak valid.", 400);
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("photos")
    .update({ status: body.status })
    .eq("id", body.photoId)
    .eq("event_id", eventId);

  if (error) return jsonError("GAGAL", error.message, 500);
  return jsonOk({ photoId: body.photoId, status: body.status });
}
