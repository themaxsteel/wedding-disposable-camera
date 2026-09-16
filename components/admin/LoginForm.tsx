"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import { FieldError, Input, Label } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Panel";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const { error: authError } = await getSupabaseBrowser().auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError("Email atau password salah.");
      setBusy(false);
      return;
    }

    const next = searchParams.get("next") ?? "/admin";
    router.replace(next);
    router.refresh();
  }

  const linkExpired = searchParams.get("link") === "kedaluwarsa";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {linkExpired ? (
        <Notice tone="warn" role="alert" title="Link masuk sudah tidak berlaku">
          Link itu kedaluwarsa atau sudah pernah dipakai. Minta link baru ke admin, atau
          masuk dengan password kalau kamu sudah membuatnya.
        </Notice>
      ) : null}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={error ? true : undefined}
        />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={error ? true : undefined}
        />
        <FieldError>{error}</FieldError>
      </div>

      <Button type="submit" block loading={busy}>
        {busy ? "Memeriksa" : "Masuk"}
      </Button>
    </form>
  );
}
