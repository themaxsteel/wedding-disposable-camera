function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Environment variable ${name} belum diisi. Salin .env.example menjadi .env.local lalu isi dari Supabase Dashboard → Project Settings → API.`,
    );
  }
  return value;
}

export const SUPABASE_URL = required(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);

export const SUPABASE_ANON_KEY = required(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

/** Hanya boleh dibaca di server. */
export function serviceRoleKey(): string {
  return required(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export const PHOTO_BUCKET = "photos";

/**
 * Jeda minimum antar klaim jatah film di server (ms). Sengaja jauh lebih kecil
 * daripada cooldown shutter di client (1,5 detik): dua foto yang dijepret
 * dengan jeda wajar bisa saja diunggah nyaris bersamaan oleh antrean, dan
 * itu tidak boleh dianggap spam. Batas jumlah film tetap penjaga utamanya.
 */
export const MIN_SHOT_INTERVAL_MS = 400;

/** Umur sesi tamu. */
export const GUEST_SESSION_HOURS = 18;

/** Jumlah foto per file ZIP; menjaga route download tetap di bawah batas waktu serverless. */
export const ZIP_PART_SIZE = 300;

/** Umur signed URL foto di dashboard. */
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

/** Jumlah foto per halaman galeri admin. */
export const GALLERY_PAGE_SIZE = 48;
