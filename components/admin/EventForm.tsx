"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { isValidSlug, slugify } from "@/lib/util/slug";
import { useIsClient } from "@/lib/util/useIsClient";
import Button from "@/components/ui/Button";
import { FieldError, Hint, Input, Label, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Panel";
import type { EventRow, FilmPreset } from "@/lib/types";

interface Props {
  mode: "create" | "edit";
  event?: EventRow;
}

const PRESETS: { value: FilmPreset; label: string; hint: string; swatch: string }[] = [
  {
    value: "classic",
    label: "Classic",
    hint: "Hangat tipis, kontras lembut",
    swatch: "bg-[linear-gradient(135deg,#6f5a48,#c9a57f)]",
  },
  {
    value: "warm",
    label: "Warm",
    hint: "Lebih oranye, nuansa senja",
    swatch: "bg-[linear-gradient(135deg,#7a4a2a,#e8a15c)]",
  },
  {
    value: "bw",
    label: "Hitam putih",
    hint: "Grayscale berkontras",
    swatch: "bg-[linear-gradient(135deg,#2b2b2b,#bdbdbd)]",
  },
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
        ? "Terima kasih sudah datang. Ambil beberapa foto untuk kami, hasilnya baru kami cuci setelah acara."
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
    <form onSubmit={handleSubmit} className="space-y-8">
      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="sr-only">Identitas acara</legend>
        <div className="sm:col-span-2">
          <Label htmlFor="couple">Nama pengantin</Label>
          <Input
            id="couple"
            required
            maxLength={80}
            value={coupleNames}
            onChange={(e) => handleCoupleNames(e.target.value)}
            placeholder="Kevin & Sarah"
          />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="slug">Alamat untuk tamu</Label>
          <div className="flex h-11 w-full items-stretch rounded-xl border border-line-strong bg-shell/70 transition duration-200 hover:border-cream/25 focus-within:border-film/70 focus-within:ring-3 focus-within:ring-film/15">
            <span className="flex items-center border-r border-line pr-2.5 pl-3.5 font-mono text-xs text-cream/50">
              /e/
            </span>
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
              aria-describedby="slug-hint"
              className="min-w-0 flex-1 bg-transparent px-3 font-mono text-sm text-cream outline-none placeholder:text-cream/40 focus-visible:outline-none"
            />
          </div>
          {slugChanged ? (
            <Hint id="slug-hint" warn>
              Mengubah alamat membuat QR yang sudah dicetak tidak berfungsi lagi.
            </Hint>
          ) : (
            <Hint id="slug-hint">Tercetak di QR. Huruf kecil, angka, dan tanda hubung.</Hint>
          )}
        </div>

        <div>
          <Label htmlFor="date">Tanggal acara</Label>
          <Input
            id="date"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="limit">Jatah foto per tamu</Label>
          <Input
            id="limit"
            type="number"
            inputMode="numeric"
            min={1}
            max={500}
            required
            value={filmLimit}
            onChange={(e) => setFilmLimit(e.target.value)}
            className="font-mono tabular-nums"
          />
        </div>
      </fieldset>

      <fieldset className="space-y-5 border-t border-line pt-7">
        <legend className="float-left mb-1 w-full text-base font-semibold">Jadwal kamera</legend>
        <div className="grid clear-both gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="opens">
              Dibuka <span className="font-normal text-cream/45">(opsional)</span>
            </Label>
            <Input
              id="opens"
              type="datetime-local"
              value={isClient ? opensAt : ""}
              onChange={(e) => setOpensAt(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="closes">
              Ditutup <span className="font-normal text-cream/45">(opsional)</span>
            </Label>
            <Input
              id="closes"
              type="datetime-local"
              value={isClient ? closesAt : ""}
              onChange={(e) => setClosesAt(e.target.value)}
            />
          </div>
        </div>
        <Hint flush>
          Jam mengikuti zona waktu perangkat ini. Kosongkan agar kamera selalu terbuka.
        </Hint>

        {mode === "edit" ? (
          <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-line bg-shell/40 p-4">
            <span className="text-sm">
              <span className="block font-medium">Kamera aktif</span>
              <span className="mt-0.5 block text-cream/55">
                Matikan untuk menutup kamera kapan saja, apa pun jadwalnya.
              </span>
            </span>
            <span className="relative mt-0.5 inline-flex shrink-0">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className="h-6 w-11 rounded-full bg-cream/15 transition-colors duration-200 peer-checked:bg-film peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-film"
              />
              <span
                aria-hidden
                className="absolute top-1 left-1 size-4 rounded-full bg-cream transition-transform duration-200 peer-checked:translate-x-5 peer-checked:bg-shell"
              />
            </span>
          </label>
        ) : null}
      </fieldset>

      <fieldset className="space-y-5 border-t border-line pt-7">
        <legend className="float-left mb-1 w-full text-base font-semibold">Untuk tamu</legend>
        <div className="clear-both">
          <span className="mb-2 block text-[13px] font-medium text-cream/75">Gaya versi film</span>
          <div role="radiogroup" aria-label="Gaya versi film" className="grid gap-2 sm:grid-cols-3">
            {PRESETS.map((preset) => {
              const selected = filmPreset === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setFilmPreset(preset.value)}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition duration-200 active:scale-[0.98] ${
                    selected
                      ? "border-film bg-film/[0.08]"
                      : "border-line-strong hover:border-cream/30"
                  }`}
                >
                  <span className={`size-9 shrink-0 rounded-lg ${preset.swatch}`} aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{preset.label}</span>
                    <span className="block text-xs text-cream/50">{preset.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label htmlFor="welcome">Pesan sambutan</Label>
          <Textarea
            id="welcome"
            rows={3}
            maxLength={300}
            value={welcomeText}
            onChange={(e) => setWelcomeText(e.target.value)}
          />
          <Hint>Tampil di bawah nama pengantin saat tamu memindai QR.</Hint>
        </div>
      </fieldset>

      <div className="space-y-4 border-t border-line pt-7">
        <FieldError>{error}</FieldError>
        {saved ? <Notice tone="ok">Pengaturan tersimpan.</Notice> : null}
        <Button type="submit" loading={busy}>
          {busy ? "Menyimpan" : mode === "create" ? "Buat acara" : "Simpan pengaturan"}
        </Button>
      </div>
    </form>
  );
}
