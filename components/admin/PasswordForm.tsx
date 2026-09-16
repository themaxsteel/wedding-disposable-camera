"use client";
import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import Button, { LinkButton } from "@/components/ui/Button";
import { FieldError, Hint, Input, Label } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Panel";

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
      <div className="space-y-4">
        <Notice tone="ok" title="Password tersimpan">
          Mulai sekarang kamu bisa masuk dengan email dan password ini.
        </Notice>
        <LinkButton href="/admin">Lihat acara</LinkButton>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label htmlFor="new-password">Password baru</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Hint>Minimal 8 karakter.</Hint>
      </div>
      <div>
        <Label htmlFor="confirm-password">Ulangi password</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          aria-invalid={error ? true : undefined}
        />
        <FieldError>{error}</FieldError>
      </div>

      <Button type="submit" loading={busy}>
        {busy ? "Menyimpan" : "Simpan password"}
      </Button>
    </form>
  );
}
