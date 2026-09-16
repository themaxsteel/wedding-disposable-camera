"use client";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await getSupabaseBrowser().auth.signOut();
        router.replace("/admin/login");
        router.refresh();
      }}
      className="rounded-lg border border-cream/15 px-3 py-2 text-xs text-cream/60 transition hover:border-film/40 hover:text-cream"
    >
      Keluar
    </button>
  );
}
