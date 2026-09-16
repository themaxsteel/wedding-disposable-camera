"use server";
import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ALLOWED_TYPES: EmailOtpType[] = ["invite", "magiclink", "recovery"];

/** Hanya izinkan tujuan di dalam /admin — mencegah open redirect lewat ?next=. */
function safeNext(next: string): string {
  if (next.startsWith("/admin") && !next.startsWith("//")) return next;
  return "/admin";
}

/**
 * Tukar token sekali pakai menjadi sesi login.
 *
 * Sengaja lewat POST dari tombol, bukan saat halaman dibuka: WhatsApp,
 * pemindai link email, dan prerender browser membuka URL lebih dulu untuk
 * membuat preview — kalau token dipakai pada GET, merekalah yang
 * menghabiskannya dan pengantin mendapat "link kedaluwarsa".
 */
export async function confirmAccess(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const type = String(formData.get("type") ?? "") as EmailOtpType;
  const next = safeNext(String(formData.get("next") ?? ""));

  if (!tokenHash || !ALLOWED_TYPES.includes(type)) {
    redirect("/admin/login?link=kedaluwarsa");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error) {
    // Tombol ditekan dua kali: token pertama sudah memberi sesi, jadi lanjutkan
    // ke dashboard — tapi bukan ke halaman "buat password", karena sesi yang
    // aktif belum tentu milik orang yang diundang.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    redirect(user ? "/admin" : "/admin/login?link=kedaluwarsa");
  }

  redirect(next);
}
