"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TrashIcon } from "@phosphor-icons/react/ssr";
import Button from "@/components/ui/Button";
import { FieldError, Input, Label } from "@/components/ui/Field";

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
      setError("Koneksi terputus. Acara mungkin baru terhapus sebagian, tekan hapus lagi.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3 text-sm text-cream/70">
        <p>Menghapus acara ini menghilangkan secara permanen:</p>
        <ul className="grid gap-2 sm:grid-cols-3">
          <li className="rounded-xl border border-danger/20 bg-shell/50 p-3">
            <span className="block font-mono text-xl text-cream tabular-nums">{photoCount}</span>
            <span className="text-xs text-cream/55">foto, versi film, dan thumbnail</span>
          </li>
          <li className="rounded-xl border border-danger/20 bg-shell/50 p-3">
            <span className="block font-mono text-xl text-cream tabular-nums">{guestCount}</span>
            <span className="text-xs text-cream/55">data tamu dan akses anggota</span>
          </li>
          <li className="rounded-xl border border-danger/20 bg-shell/50 p-3">
            <span className="block truncate font-mono text-sm leading-7 text-cream">/e/{slug}</span>
            <span className="text-xs text-cream/55">QR yang sudah dicetak berhenti berfungsi</span>
          </li>
        </ul>
        <p className="text-danger">
          Tidak bisa dibatalkan. Unduh ZIP dulu kalau fotonya masih dibutuhkan.
        </p>
      </div>

      <div>
        <Label htmlFor="confirm-slug">
          Ketik <span className="font-mono text-cream">{slug}</span> untuk konfirmasi
        </Label>
        <Input
          id="confirm-slug"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          disabled={busy}
          className="font-mono"
        />
        <FieldError>{error}</FieldError>
      </div>

      <Button
        variant="danger"
        onClick={handleDelete}
        disabled={!matches}
        loading={busy}
        icon={<TrashIcon className="size-4" weight="bold" aria-hidden />}
      >
        {busy ? "Menghapus, jangan tutup halaman ini" : "Hapus acara permanen"}
      </Button>
    </div>
  );
}
