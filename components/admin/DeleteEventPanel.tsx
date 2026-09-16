"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  eventId: string;
  slug: string;
  coupleNames: string;
  photoCount: number;
  guestCount: number;
}

export default function DeleteEventPanel({
  eventId,
  slug,
  coupleNames,
  photoCount,
  guestCount,
}: Props) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = confirmation.trim() === slug;

  async function handleDelete() {
    if (!matches || busy) return;
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmSlug: confirmation.trim() }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        setError(data?.message ?? "Gagal menghapus acara. Coba lagi.");
        setBusy(false);
        return;
      }

      router.replace(`/admin?dihapus=${encodeURIComponent(coupleNames)}`);
      router.refresh();
    } catch {
      setError("Koneksi terputus. Acara mungkin baru terhapus sebagian — tekan hapus lagi.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1 text-sm text-cream/70">
        <p>Menghapus acara ini akan menghilangkan secara permanen:</p>
        <ul className="list-disc space-y-0.5 pl-5 text-cream/60">
          <li>
            <b className="text-cream">{photoCount}</b> foto beserta versi film dan thumbnail-nya
          </li>
          <li>
            data <b className="text-cream">{guestCount}</b> tamu dan akses semua anggota
          </li>
          <li>
            alamat <span className="font-mono">/e/{slug}</span> — QR yang sudah dicetak berhenti
            berfungsi
          </li>
        </ul>
        <p className="pt-1 text-red-300">Tidak bisa dibatalkan. Unduh ZIP dulu kalau fotonya masih dibutuhkan.</p>
      </div>

      <div>
        <label htmlFor="confirm-slug" className="mb-1 block text-xs text-cream/50">
          Ketik <span className="font-mono text-cream">{slug}</span> untuk konfirmasi
        </label>
        <input
          id="confirm-slug"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          disabled={busy}
          className="w-full rounded-lg border border-red-400/30 bg-black/30 px-3 py-2.5 font-mono text-sm outline-none focus:border-red-400/70"
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleDelete}
        disabled={!matches || busy}
        className="rounded-lg bg-red-500/90 px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Menghapus… jangan tutup halaman ini" : "Hapus acara permanen"}
      </button>
    </div>
  );
}
