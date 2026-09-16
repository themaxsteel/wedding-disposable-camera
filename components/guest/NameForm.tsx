"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const DEVICE_KEY = "dcam_device_id";
const LAST_NAME_KEY = "dcam_last_name";

function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, fresh);
    return fresh;
  } catch {
    // Mode privat / storage diblokir: device id sesi ini saja.
    return crypto.randomUUID();
  }
}

interface Props {
  slug: string;
  tableLabel: string | null;
}

export default function NameForm({ slug, tableLabel }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Menulis langsung ke DOM, bukan lewat state: prefill nama terakhir
  // tidak boleh memicu render ulang atau mismatch saat hidrasi.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    try {
      const last = localStorage.getItem(LAST_NAME_KEY);
      if (last && !input.value) input.value = last;
    } catch {
      /* abaikan */
    }
    input.focus();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = inputRef.current?.value.trim() ?? "";
    if (trimmed.length < 2) {
      setError("Tulis nama kamu dulu ya (minimal 2 huruf).");
      inputRef.current?.focus();
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          name: trimmed,
          tableLabel,
          deviceId: getDeviceId(),
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        setError(data?.message ?? "Gagal menyiapkan kamera. Coba lagi.");
        setBusy(false);
        return;
      }

      try {
        localStorage.setItem(LAST_NAME_KEY, trimmed);
      } catch {
        /* abaikan */
      }
      router.replace(`/e/${slug}/kamera`);
    } catch {
      setError("Koneksi bermasalah. Cek sinyal lalu coba lagi.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <div>
        <label
          htmlFor="guest-name"
          className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-cream/50"
        >
          Nama kamu
        </label>
        <input
          ref={inputRef}
          id="guest-name"
          name="name"
          type="text"
          inputMode="text"
          autoComplete="name"
          enterKeyHint="go"
          maxLength={40}
          defaultValue=""
          placeholder="Misal: Dinda"
          className="w-full rounded-xl border border-cream/15 bg-shell-2 px-4 py-4 text-lg text-cream outline-none placeholder:text-cream/25 focus:border-film/70"
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
        className="w-full rounded-xl bg-film px-4 py-4 text-base font-semibold text-shell transition active:scale-[0.99] disabled:opacity-60"
      >
        {busy ? "Menyiapkan kamera…" : "Ambil kamera"}
      </button>

      <p className="text-center text-xs leading-relaxed text-cream/40">
        Nama dipakai supaya pengantin tahu foto ini dari siapa.
        Foto langsung tersimpan dan baru &ldquo;dicuci&rdquo; setelah acara.
      </p>
    </form>
  );
}
