import { z } from "zod";
import { SLUG_PATTERN } from "@/lib/util/slug";

/** Input form acara — sama untuk buat baru dan ubah pengaturan. */
export const eventInputSchema = z
  .object({
    coupleNames: z.string().trim().min(2, "Nama pengantin minimal 2 karakter.").max(80),
    slug: z
      .string()
      .trim()
      .min(3, "Slug minimal 3 karakter.")
      .max(60, "Slug maksimal 60 karakter.")
      .regex(SLUG_PATTERN, "Slug hanya boleh huruf kecil, angka, dan tanda hubung."),
    eventDate: z.string().date().nullish(),
    welcomeText: z.string().trim().max(300).nullish(),
    filmLimit: z.number().int().min(1).max(500),
    filmPreset: z.enum(["classic", "warm", "bw"]),
    opensAt: z.string().datetime({ offset: true }).nullish(),
    closesAt: z.string().datetime({ offset: true }).nullish(),
    isActive: z.boolean().default(true),
  })
  .refine(
    (value) =>
      !value.opensAt || !value.closesAt || new Date(value.opensAt) < new Date(value.closesAt),
    { message: "Jam tutup harus setelah jam buka.", path: ["closesAt"] },
  );

export type EventInput = z.infer<typeof eventInputSchema>;

/** Petakan ke kolom tabel events. */
export function toEventRow(input: EventInput) {
  return {
    couple_names: input.coupleNames,
    slug: input.slug,
    event_date: input.eventDate || null,
    welcome_text: input.welcomeText?.trim() ? input.welcomeText.trim() : null,
    film_limit: input.filmLimit,
    film_preset: input.filmPreset,
    opens_at: input.opensAt || null,
    closes_at: input.closesAt || null,
    is_active: input.isActive,
  };
}

/** Pesan pertama dari hasil validasi Zod, untuk ditampilkan di form. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Input tidak valid.";
}
