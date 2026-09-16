"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { isValidSlug, slugify } from "@/lib/util/slug";
import { useIsClient } from "@/lib/util/useIsClient";
import type { EventRow, FilmPreset } from "@/lib/types";

interface Props {
  mode: "create" | "edit";
  event?: EventRow;
}

const PRESETS: { value: FilmPreset; label: string; hint: string }[] = [
  { value: "classic", label: "Classic", hint: "hangat tipis, kontras lembut" },
  { value: "warm", label: "Warm", hint: "lebih oranye, nuansa senja" },
  { value: "bw", label: "Hitam putih", hint: "grayscale berkontras" },
];

/** ISO → nilai <input type="datetime-local"> dalam zona waktu perangkat. */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

function fromLocalInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

const inputClass =
  "w-full rounded-lg border border-cream/15 bg-black/30 px-3 py-2.5 text-sm text-cream outline-none placeholder:text-cream/25 focus:border-film/60";
const labelClass = "mb-1 block text-xs text-cream/50";

export default function EventForm({ mode, event }: Props) {
  const router = useRouter();
  const isClient = useIsClient();

  const [coupleNames, setCoupleNames] = useState(event?.couple_names ?? "");
  const [slug, setSlug] = useState(event?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [eventDate, setEventDate] = useState(event?.event_date ?? "");
  const [welcomeText, setWelcomeText] = useState(
    event?.welcome_text ??
      (mode === "create"
        ? "Terima kasih sudah datang. Ambil beberapa foto untuk kami — hasilnya baru kami cuci setelah acara."
        : ""),
  );
  const [filmLimit, setFilmLimit] = useState(String(event?.film_limit ?? 27));
  const [filmPreset, setFilmPreset] = useState<FilmPreset>(event?.film_preset ?? "classic");
  // Dihitung di browser saja: zona waktu server (UTC) berbeda dengan perangkat admin.
  const [opensAt, setOpensAt] = useState(() =>
    typeof window === "undefined" ? "" : toLocalInput(event?.opens_at),
  );
  const [closesAt, setClosesAt] = useState(() =>
    typeof window === "undefined" ? "" : toLocalInput(event?.closes_at),
  );
  const [isActive, setIsActive] = useState(event?.is_active ?? true);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const slugChanged = mode === "edit" && event && slug !== event.slug;

  function handleCoupleNames(value: string) {
    setCoupleNames(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleSubmit(submitEvent: React.FormEvent) {
    submitEvent.preventDefault();
    setError(null);
    setSaved(false);

    if (!isValidSlug(slug)) {
      setError("Slug minimal 3 karakter dan hanya boleh huruf kecil, angka, dan tanda hubung.");
      return;
    }
    const limit = Number(filmLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      setError("Jatah film harus angka 1 sampai 500.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(
        mode === "create" ? "/api/admin/events" : `/api/admin/events/${event!.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            coupleNames,
            slug,
            eventDate: eventDate || null,
            welcomeText: welcomeText || null,
            filmLimit: limit,
            filmPreset,
            opensAt: fromLocalInput(opensAt),
            closesAt: fromLocalInput(closesAt),
            isActive,
          }),
        },
      );
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        setError(data?.message ?? "Gagal menyimpan. Coba lagi.");
        return;
      }

      if (mode === "create") {
        router.push(`/admin/${data.eventId}/pengaturan?baru=1`);
      } else {
        setSaved(true);
        router.refresh();
      }
    } catch {
      setError("Koneksi bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="couple" className={labelClass}>
            Nama pengantin
          </label>
          <input
            id="couple"
            required
            maxLength={80}
            value={coupleNames}
            onChange={(e) => handleCoupleNames(e.target.value)}
            placeholder="Kevin & Sarah"
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="slug" className={labelClass}>
            Alamat untuk tamu
          </label>
          <div className="flex items-stretch overflow-hidden rounded-lg border border-cream/15 bg-black/30 focus-within:border-film/60">
            <span className="flex items-center px-3 font-mono text-xs text-cream/35">/e/</span>
            <input
              id="slug"
              required
              maxLength={60}
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
              }}
              placeholder="kevin-sarah"
              className="min-w-0 flex-1 bg-transparent py-2.5 pr-3 font-mono text-sm text-cream outline-none placeholder:text-cream/25"
            />
          </div>
          {slugChanged ? (
            <p className="mt-1 text-xs text-film">
              Mengubah alamat membuat QR yang sudah dicetak tidak berfungsi lagi.
            </p>
          ) : (
            <p className="mt-1 text-xs text-cream/35">
              Tercetak di QR. Huruf kecil, angka, dan tanda hubung.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="date" className={labelClass}>
            Tanggal acara
          </label>
          <input
            id="date"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="limit" className={labelClass}>
            Jatah foto per tamu
          </label>
          <input
            id="limit"
            type="number"
            inputMode="numeric"
            min={1}
            max={500}
            required
            value={filmLimit}
            onChange={(e) => setFilmLimit(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="opens" className={labelClass}>
            Kamera dibuka <span className="text-cream/30">(opsional)</span>
          </label>
          <input
            id="opens"
            type="datetime-local"
            value={isClient ? opensAt : ""}
            onChange={(e) => setOpensAt(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="closes" className={labelClass}>
            Kamera ditutup <span className="text-cream/30">(opsional)</span>
          </label>
          <input
            id="closes"
            type="datetime-local"
            value={isClient ? closesAt : ""}
            onChange={(e) => setClosesAt(e.target.value)}
            className={inputClass}
          />
        </div>
        <p className="-mt-2 text-xs text-cream/35 sm:col-span-2">
          Jam mengikuti zona waktu perangkat ini. Kosongkan agar kamera selalu terbuka.
        </p>

        <div className="sm:col-span-2">
          <span className={labelClass}>Gaya versi film</span>
          <div className="grid gap-2 sm:grid-cols-3">
            {PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setFilmPreset(preset.value)}
                aria-pressed={filmPreset === preset.value}
                className={`rounded-lg border px-3 py-2.5 text-left transition ${
                  filmPreset === preset.value
                    ? "border-film bg-film/10"
                    : "border-cream/15 hover:border-cream/30"
                }`}
              >
                <span className="block text-sm">{preset.label}</span>
                <span className="block text-[11px] text-cream/40">{preset.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="welcome" className={labelClass}>
            Pesan sambutan untuk tamu
          </label>
          <textarea
            id="welcome"
            rows={3}
            maxLength={300}
            value={welcomeText}
            onChange={(e) => setWelcomeText(e.target.value)}
            className={inputClass}
          />
        </div>

        {mode === "edit" ? (
          <label className="flex items-center gap-3 sm:col-span-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 accent-[#f0a04b]"
            />
            <span className="text-sm">
              Kamera aktif
              <span className="block text-xs text-cream/40">
                Matikan untuk menutup kamera kapan saja, apa pun jadwalnya.
              </span>
            </span>
          </label>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-film">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="text-sm text-teal">
          Pengaturan tersimpan.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-film px-5 py-2.5 text-sm font-semibold text-shell disabled:opacity-60"
      >
        {busy ? "Menyimpan…" : mode === "create" ? "Buat acara" : "Simpan pengaturan"}
      </button>
    </form>
  );
}
