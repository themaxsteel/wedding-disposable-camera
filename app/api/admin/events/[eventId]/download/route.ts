import { type NextRequest } from "next/server";
import { Readable } from "node:stream";
import { ZipArchive } from "archiver";
import { getEventAccess } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/api";
import { PHOTO_BUCKET, ZIP_DOWNLOAD_CONCURRENCY, ZIP_PART_SIZE } from "@/lib/env";
import { toFolderName } from "@/lib/util/name";

export const runtime = "nodejs";
export const maxDuration = 300; // Vercel Pro; Hobby tetap dibatasi 60 detik.

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
  const part = Math.max(0, Number(url.searchParams.get("part") ?? "0") || 0);

  const admin = createAdminClient();

  let query = admin
    .from("photos")
    .select(
      "id, storage_path, filtered_path, created_at, taken_at, guests!inner(display_name, name_key)",
    )
    .eq("event_id", eventId)
    .eq("status", "ready")
    .order("created_at", { ascending: true })
    .range(part * ZIP_PART_SIZE, part * ZIP_PART_SIZE + ZIP_PART_SIZE - 1);

  if (nameKey) query = query.eq("guests.name_key", nameKey);

  const { data, error } = await query;
  if (error) return jsonError("GAGAL", error.message, 500);

  type Row = {
    id: string;
    storage_path: string;
    filtered_path: string | null;
    created_at: string;
    taken_at: string | null;
    guests: { display_name: string; name_key: string };
  };
  const rows = (data ?? []) as unknown as Row[];

  if (rows.length === 0) {
    return jsonError("GAGAL", "Tidak ada foto pada bagian ini.", 404);
  }

  // store: JPEG sudah terkompresi, mengompres ulang hanya membakar waktu CPU.
  const archive = new ZipArchive({ store: true, zlib: { level: 0 } });
  archive.on("error", () => {
    /* stream ditutup oleh konsumen */
  });

  const storage = admin.storage.from(PHOTO_BUCKET);

  // Foto gagal diambil dilewati, sama seperti sebelumnya.
  async function fetchPhoto(row: Row): Promise<Buffer | null> {
    const path =
      variant === "film" && row.filtered_path ? row.filtered_path : row.storage_path;
    try {
      const { data: file, error: downloadError } = await storage.download(path);
      if (downloadError || !file) return null;
      return Buffer.from(await file.arrayBuffer());
    } catch {
      return null;
    }
  }

  function appendPhoto(row: Row, buffer: Buffer | null) {
    if (!buffer) return;
    const when = new Date(row.taken_at ?? row.created_at);
    const stamp = when
      .toISOString()
      .replace(/[:T]/g, "-")
      .slice(0, 16);
    const folder = toFolderName(row.guests.display_name);
    archive.append(buffer, {
      name: `${folder}/${stamp}_${row.id.slice(0, 8)}.jpg`,
      date: when,
    });
  }

  void (async () => {
    try {
      // Jendela geser: beberapa foto diunduh bersamaan, tetapi masuk ZIP sesuai
      // urutan. Paling banyak ZIP_DOWNLOAD_CONCURRENCY buffer tertahan di memori.
      const inFlight: { row: Row; buffer: Promise<Buffer | null> }[] = [];
      for (const row of rows) {
        inFlight.push({ row, buffer: fetchPhoto(row) });
        if (inFlight.length >= ZIP_DOWNLOAD_CONCURRENCY) {
          const oldest = inFlight.shift()!;
          appendPhoto(oldest.row, await oldest.buffer);
        }
      }
      for (const item of inFlight) {
        appendPhoto(item.row, await item.buffer);
      }
    } finally {
      await archive.finalize();
    }
  })();

  const slug = access.event.slug;
  const label = nameKey ? toFolderName(nameKey) : "semua";
  const filename = `${slug}-${label}-${variant}-bagian${part + 1}.zip`;

  return new Response(Readable.toWeb(archive) as ReadableStream, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
