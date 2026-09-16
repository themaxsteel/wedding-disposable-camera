import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, serviceRoleKey } from "@/lib/env";

/**
 * Client service-role: mem-bypass RLS.
 * Hanya dipakai di route handler / server component, tidak pernah sampai ke browser.
 */
export function createAdminClient() {
  return createClient(SUPABASE_URL, serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
