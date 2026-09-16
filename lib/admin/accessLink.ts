import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type AccessLinkKind = "invite" | "magiclink";

export interface AccessLink {
  url: string;
  userId: string;
  kind: AccessLinkKind;
}

/**
 * Buat link masuk sekali pakai TANPA mengirim email.
 *
 * Layanan email bawaan Supabase hanya mengirim ke alamat anggota tim project,
 * jadi undangan untuk pengantin tidak akan pernah sampai. Sebagai gantinya
 * admin menyalin link ini dan mengirimnya lewat WhatsApp.
 *
 * Email baru → akun dibuat (type invite). Email yang sudah terdaftar → link
 * masuk biasa (magiclink). Link diarahkan ke /auth/confirm milik aplikasi ini,
 * jadi tidak bergantung pada daftar Redirect URL di pengaturan Supabase.
 */
export async function createAccessLink(email: string, origin: string): Promise<AccessLink> {
  const admin = createAdminClient();

  let kind: AccessLinkKind = "invite";
  let result = await admin.auth.admin.generateLink({ type: "invite", email });

  if (result.error && (result.error.code === "email_exists" || result.error.status === 422)) {
    kind = "magiclink";
    result = await admin.auth.admin.generateLink({ type: "magiclink", email });
  }

  const { data, error } = result;
  if (error || !data?.properties?.hashed_token || !data.user) {
    throw new Error(error?.message ?? "Gagal membuat link masuk.");
  }

  const url = new URL("/auth/confirm", origin);
  url.searchParams.set("token_hash", data.properties.hashed_token);
  url.searchParams.set("type", kind);
  url.searchParams.set("next", "/admin/akun?baru=1");

  return { url: url.toString(), userId: data.user.id, kind };
}
