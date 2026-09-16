"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignOutIcon } from "@phosphor-icons/react/ssr";
import Button from "@/components/ui/Button";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant="ghost"
      size="sm"
      loading={busy}
      icon={<SignOutIcon className="size-4" aria-hidden />}
      onClick={async () => {
        setBusy(true);
        await getSupabaseBrowser().auth.signOut();
        router.replace("/admin/login");
        router.refresh();
      }}
    >
      <span className="hidden sm:inline">Keluar</span>
      <span className="sr-only sm:hidden">Keluar</span>
    </Button>
  );
}
