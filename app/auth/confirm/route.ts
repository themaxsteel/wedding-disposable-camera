import { type NextRequest } from "next/server";
import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ALLOWED_TYPES: EmailOtpType[] = ["invite", "magiclink", "recovery"];

/** Hanya izinkan tujuan di dalam /admin — mencegah open redirect lewat ?next=. */
function safeNext(next: string | null): string {
  if (next && next.startsWith("/admin") && !next.startsWith("//")) return next;
  return "/admin";
}

/** Tujuan link undangan / link masuk: tukar token jadi sesi, lalu masuk dashboard. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(url.searchParams.get("next"));

  const failPath = "/admin/login?link=kedaluwarsa";

  if (!tokenHash || !type || !ALLOWED_TYPES.includes(type)) {
    redirect(failPath);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) {
    redirect(failPath);
  }

  redirect(next);
}
