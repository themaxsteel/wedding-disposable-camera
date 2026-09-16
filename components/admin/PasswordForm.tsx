"use client";
import { useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export default function PasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }
    if (password !== confirm) {
      setError("Kedua password tidak sama.");
      return;
    }

    setBusy(true);
    const { error: updateError } = await getSupabaseBrowser().auth.updateUser({ password });
    setBusy(false);

    if (updateError) {
      setError(
        updateError.code === "same_password"
          ? "Password baru sama dengan yang lama."
          : updateError.code === "weak_password"
            ? "Password terlalu lemah, coba yang lebih panjang."
            : "Gagal menyimpan password. Coba lagi.",
      );
      return;
    }

    setPassword("");
    setConfirm("");
    setDone(true);
  }

  if (done) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-teal">Password tersimpan. Mulai sekarang kamu bisa login dengan email & password ini.</p>
        <Link
          href="/admin"
          className="inline-block rounded-lg bg-film px-4 py-2.5 text-sm font-semibold text-shell"
        >
          Lihat acara
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="new-password" className="mb-1 block text-xs text-cream/50">
          Password baru
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border border-cream/15 bg-black/30 px-3 py-2.5 text-sm outline-none focus:border-film/60"
        />
      </div>
      <div>
        <label htmlFor="confirm-password" className="mb-1 block text-xs text-cream/50">
          Ulangi password
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className="w-full rounded-lg border border-cream/15 bg-black/30 px-3 py-2.5 text-sm outline-none focus:border-film/60"
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
        className="rounded-lg bg-film px-4 py-2.5 text-sm font-semibold text-shell disabled:opacity-60"
      >
        {busy ? "Menyimpan…" : "Simpan password"}
      </button>
    </form>
  );
}
