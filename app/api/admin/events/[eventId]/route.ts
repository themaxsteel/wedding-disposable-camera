import { type NextRequest } from "next/server";
import { getEventAccess } from "@/lib/admin/access";
import { eventInputSchema, firstIssue, toEventRow } from "@/lib/admin/eventInput";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/api";
import { PHOTO_BUCKET } from "@/lib/env";

export const runtime = "nodejs";
// Menghapus acara besar = puluhan ribu file. Vercel Pro mengizinkan 300 detik.
export const maxDuration = 300;

/** Storage API menerima maksimal 1000 path per permintaan hapus. */
const REMOVE_BATCH = 1000;

type Params = { params: Promise<{ eventId: string }> };

/** Ubah pengaturan acara — admin platform, owner, atau editor. */
export async function PATCH(request: NextRequest, { params }: Params) {
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

/**
 * Hapus acara beserta SEMUA fotonya — hanya admin GuestPro.
 *
 * Urutan sengaja dibuat bisa diulang: kamera ditutup dulu (tidak ada upload
 * baru), lalu file storage dihapus per batch, dan baris acara dihapus paling
 * akhir (cascade ke tamu, sesi, foto, anggota). Kalau terputus di tengah,
 * acara masih ada dan admin cukup menekan hapus lagi.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const access = await getEventAccess(eventId);
  if (!access?.isPlatformAdmin) {
    return jsonError("SESI_TIDAK_VALID", "Hanya admin GuestPro yang bisa menghapus acara.", 403);
  }

  const body = (await request.json().catch(() => null)) as { confirmSlug?: string } | null;
  if (body?.confirmSlug !== access.event.slug) {
    return jsonError("INPUT_TIDAK_VALID", "Ketik alamat acara dengan tepat untuk konfirmasi.", 400);
  }

  const admin = createAdminClient();

  const { error: closeError } = await admin
    .from("events")
    .update({ is_active: false })
    .eq("id", eventId);
  if (closeError) {
    return jsonError("GAGAL", "Gagal menutup kamera sebelum menghapus.", 500);
  }

  const storage = admin.storage.from(PHOTO_BUCKET);
  let removedFiles = 0;

  // Selalu ambil halaman pertama: file yang sudah terhapus hilang dari daftar.
  for (let round = 0; ; round++) {
    const { data, error: listError } = await admin
      .rpc("event_storage_objects", { p_event: eventId })
      .range(0, REMOVE_BATCH - 1);

    if (listError) {
      return jsonError("GAGAL", `Gagal membaca daftar file (${removedFiles} sudah terhapus). Coba lagi.`, 500);
    }

    const names = ((data ?? []) as unknown[])
      .map((row) =>
        typeof row === "string"
          ? row
          : (row as { event_storage_objects?: string }).event_storage_objects,
      )
      .filter((name): name is string => typeof name === "string");

    if (names.length === 0) break;

    const { data: deleted, error: removeError } = await storage.remove(names);
    // Tidak ada kemajuan = berhenti, jangan berputar selamanya.
    if (removeError || !deleted || deleted.length === 0 || round > 500) {
      return jsonError(
        "GAGAL",
        `Sebagian file gagal dihapus (${removedFiles} sudah terhapus). Acara belum dihapus — coba lagi.`,
        500,
      );
    }
    removedFiles += deleted.length;
  }

  const { error: deleteError } = await admin.from("events").delete().eq("id", eventId);
  if (deleteError) {
    return jsonError(
      "GAGAL",
      `Semua file sudah terhapus (${removedFiles}), tapi data acara gagal dihapus. Coba lagi.`,
      500,
    );
  }

  return jsonOk({ eventId, removedFiles });
}
