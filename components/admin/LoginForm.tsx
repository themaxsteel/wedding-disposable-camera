"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-xs text-cream/50">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-lg border border-cream/15 bg-black/30 px-3 py-3 text-sm outline-none focus:border-film/60"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-xs text-cream/50">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border border-cream/15 bg-black/30 px-3 py-3 text-sm outline-none focus:border-film/60"
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-film">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-film px-4 py-3 text-sm font-semibold text-shell disabled:opacity-60"
      >
        {busy ? "Memeriksa…" : "Masuk"}
      </button>
    </form>
  );
}
