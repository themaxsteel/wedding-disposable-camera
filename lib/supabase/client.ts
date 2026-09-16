"use client";
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

let cached: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Anon key di browser sengaja tidak punya hak baca apa pun (lihat 0003_rls.sql).
 * Dipakai hanya untuk: login admin, dan uploadToSignedUrl milik tamu.
 */
export function getSupabaseBrowser() {
  if (!cached) {
    cached = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return cached;
}
