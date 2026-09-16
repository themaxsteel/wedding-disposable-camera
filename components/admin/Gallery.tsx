"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import {
  CaretLeftIcon,
  CaretRightIcon,
  CheckIcon,
  DownloadSimpleIcon,
  EyeSlashIcon,
  FunnelSimpleIcon,
  ImagesIcon,
  MagnifyingGlassIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react/ssr";
import { ZIP_PART_SIZE } from "@/lib/env";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import { controlClass } from "@/components/ui/Field";
import { EmptyState, Skeleton } from "@/components/ui/States";
import type { AdminPhotoItem, GuestSummaryRow } from "@/lib/types";

type Variant = "orig" | "film";

interface Props {
  eventId: string;
  guests: GuestSummaryRow[];
  totalPhotos: number;
  /** Anggota "lihat saja" tidak boleh menyembunyikan foto. */
  canManage: boolean;
}

const VARIANTS: { value: Variant; label: string }[] = [
  { value: "orig", label: "Asli" },
  { value: "film", label: "Versi film" },
];

export default function Gallery({ eventId, guests, totalPhotos, canManage }: Props) {
  const [activeGuest, setActiveGuest] = useState<string | null>(null);
  const [variant, setVariant] = useState<Variant>("orig");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<AdminPhotoItem[]>([]);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [downloaded, setDownloaded] = useState<Set<string>>(() => new Set());

  // Lightbox menyimpan indeks supaya bisa maju-mundur; arah untuk animasi geser.
  const [lightbox, setLightbox] = useState<{ index: number; direction: number } | null>(null);
  const [confirmHide, setConfirmHide] = useState(false);
  const [hiding, setHiding] = useState(false);
  const [hideError, setHideError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  // Halaman yang datang terlambat setelah ganti filter harus dibuang.
  const requestRef = useRef(0);
  const cursorRef = useRef<string | null>(null);
  // Penjaga in-flight pakai ref, bukan state: ganti filter harus tetap
  // bisa memulai permintaan baru walaupun halaman sebelumnya belum selesai.
  const loadingRef = useRef(false);
  const touchStartRef = useRef<number | null>(null);

  const loadPage = useCallback(
    async (reset: boolean) => {
      if (loadingRef.current && !reset) return;
      const token = reset ? ++requestRef.current : requestRef.current;
      loadingRef.current = true;
      setLoading(true);

      try {
        const url = new URL(
          `/api/admin/events/${eventId}/photos`,
          window.location.origin,
        );
        url.searchParams.set("variant", variant);
        if (activeGuest) url.searchParams.set("guest", activeGuest);
        if (!reset && cursorRef.current) {
          url.searchParams.set("cursor", cursorRef.current);
        }

        // Gagal jaringan dianggap respons gagal, bukan exception.
        const response = await fetch(url).catch(() => null);
        const data = response ? await response.json().catch(() => null) : null;
        if (token !== requestRef.current) return;

        if (!response) {
          setLoadError("Koneksi terputus saat memuat foto.");
          setDone(true);
          return;
        }
        if (!response.ok || !data?.ok) {
          setLoadError(data?.message ?? "Foto gagal dimuat.");
          setDone(true);
          return;
        }

        setItems((previous) =>
          reset ? data.items : [...previous, ...(data.items as AdminPhotoItem[])],
        );
        cursorRef.current = data.nextCursor;
        setDone(data.nextCursor === null);
      } finally {
        if (token === requestRef.current) {
          loadingRef.current = false;
          setLoading(false);
        }
      }
    },
    [activeGuest, eventId, variant],
  );

  // Reset dilakukan di handler (lihat changeFilter) supaya effect ini
  // hanya bertugas satu hal: mengambil halaman pertama untuk filter aktif.
  useEffect(() => {
    void loadPage(true);
  }, [loadPage]);

  function changeFilter(next: { guest?: string | null; variant?: Variant }) {
    setItems([]);
    cursorRef.current = null;
    setDone(false);
    setLoadError(null);
    setLightbox(null);
    if (next.guest !== undefined) {
      setActiveGuest(next.guest);
      setFilterOpen(false);
    }
    if (next.variant !== undefined) setVariant(next.variant);
  }

  function retry() {
    setLoadError(null);
    setDone(false);
    void loadPage(items.length === 0);
  }

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || done) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loading) void loadPage(false);
      },
      { rootMargin: "600px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [done, loadPage, loading]);

  // --- Lightbox -------------------------------------------------------
  const current = lightbox ? items[lightbox.index] : undefined;

  const openAt = useCallback(
    (index: number, direction = 0) => {
      if (index < 0 || index >= items.length) return;
      setHideError(null);
      setLightbox({ index, direction });
      // Mendekati ujung daftar: ambil halaman berikutnya lebih awal.
      if (index >= items.length - 3 && !done) void loadPage(false);
    },
    [done, items.length, loadPage],
  );

  const close = useCallback(() => {
    setLightbox(null);
    setHideError(null);
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [lightbox]);

  useEffect(() => {
    if (!lightbox || confirmHide) return;
    function onKey(event: KeyboardEvent) {
      if (!lightbox) return;
      if (event.key === "Escape") close();
      else if (event.key === "ArrowRight") openAt(lightbox.index + 1, 1);
      else if (event.key === "ArrowLeft") openAt(lightbox.index - 1, -1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, confirmHide, lightbox, openAt]);

  async function hideCurrent() {
    if (!lightbox || !current) return;
    setHiding(true);
    setHideError(null);
    try {
      const response = await fetch(`/api/admin/events/${eventId}/photos`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          photoId: current.id,
          status: current.status === "hidden" ? "ready" : "hidden",
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        setHideError(data?.message ?? "Foto gagal disembunyikan. Coba lagi.");
        return;
      }
      const index = lightbox.index;
      const remaining = items.length - 1;
      setItems((previous) => previous.filter((item) => item.id !== current.id));
      // Tetap di posisi yang sama: foto berikutnya bergeser ke indeks ini.
      if (remaining === 0) setLightbox(null);
      else setLightbox({ index: Math.min(index, remaining - 1), direction: 1 });
    } catch {
      setHideError("Koneksi terputus. Coba lagi.");
    } finally {
      setHiding(false);
      setConfirmHide(false);
    }
  }

  // --- Unduhan --------------------------------------------------------
  const selectedGuest = activeGuest
    ? guests.find((guest) => guest.name_key === activeGuest)
    : undefined;
  const selectedCount = activeGuest ? (selectedGuest?.photo_count ?? 0) : totalPhotos;
  const parts = Math.max(1, Math.ceil(selectedCount / ZIP_PART_SIZE));

  function downloadUrl(part: number) {
    const query = new URLSearchParams({ variant, part: String(part) });
    if (activeGuest) query.set("guest", activeGuest);
    return `/api/admin/events/${eventId}/download?${query.toString()}`;
  }

  const visibleGuests = guests.filter((guest) =>
    guest.display_name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const guestList = (
    <div className="space-y-3">
      <div className="relative">
        <MagnifyingGlassIcon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-cream/40"
          aria-hidden
        />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari nama tamu"
          aria-label="Cari nama tamu"
          className={`${controlClass} h-10 bg-shell/70 pl-9 text-sm`}
        />
      </div>

      <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-line bg-shell-2/60 p-1 lg:max-h-[calc(100dvh-14rem)]">
        <GuestRow
          label="Semua tamu"
          count={totalPhotos}
          active={activeGuest === null}
          onSelect={() => changeFilter({ guest: null })}
        />
        {visibleGuests.map((guest) => (
          <GuestRow
            key={guest.name_key}
            label={guest.display_name}
            sub={guest.table_labels.join(", ")}
            count={guest.photo_count}
            active={activeGuest === guest.name_key}
            onSelect={() => changeFilter({ guest: guest.name_key })}
          />
        ))}
        {visibleGuests.length === 0 && search ? (
          <p className="px-3 py-4 text-sm text-cream/50">Tidak ada tamu bernama itu.</p>
        ) : null}
      </div>
    </div>
  );

  const firstLoad = items.length === 0 && (loading || (!done && !loadError));

  return (
    <div className="grid gap-6 lg:grid-cols-[272px_1fr] lg:gap-8">
      {/* Filter tamu: sidebar di layar lebar */}
      <aside className="hidden lg:block">
        <div className="sticky top-20">{guestList}</div>
      </aside>

      <section className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter tamu: tombol pembuka panel di HP */}
          <Button
            variant="secondary"
            className="lg:hidden"
            onClick={() => setFilterOpen(true)}
            icon={<FunnelSimpleIcon className="size-4" aria-hidden />}
          >
            <span className="max-w-40 truncate">
              {selectedGuest ? selectedGuest.display_name : "Semua tamu"}
            </span>
            <span className="font-mono text-xs text-cream/50 tabular-nums">{selectedCount}</span>
          </Button>

          <div
            role="radiogroup"
            aria-label="Versi foto"
            className="relative grid h-11 grid-cols-2 rounded-xl border border-line-strong bg-shell/60 p-1"
          >
            <span
              aria-hidden
              className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-lg bg-film transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ transform: variant === "film" ? "translateX(100%)" : "translateX(0)" }}
            />
            {VARIANTS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={variant === option.value}
                onClick={() => variant !== option.value && changeFilter({ variant: option.value })}
                className={`relative z-10 rounded-lg px-4 text-sm font-medium transition-colors duration-200 ${
                  variant === option.value ? "text-shell" : "text-cream/65 hover:text-cream"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {selectedCount > 0
              ? Array.from({ length: parts }, (_, index) => {
                  const key = `${variant}:${activeGuest ?? "*"}:${index}`;
                  const clicked = downloaded.has(key);
                  return (
                    <a
                      key={key}
                      href={downloadUrl(index)}
                      onClick={() =>
                        setDownloaded((previous) => new Set(previous).add(key))
                      }
                      className="inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong bg-cream/[0.03] px-4 text-sm font-medium text-cream/85 transition duration-200 hover:border-film/50 hover:text-cream active:scale-[0.98]"
                    >
                      {clicked ? (
                        <CheckIcon className="size-4 text-ok" weight="bold" aria-hidden />
                      ) : (
                        <DownloadSimpleIcon className="size-4" aria-hidden />
                      )}
                      {parts === 1 ? (
                        <>
                          Unduh ZIP
                          <span className="font-mono text-xs text-cream/50 tabular-nums">
                            {selectedCount}
                          </span>
                        </>
                      ) : (
                        `Bagian ${index + 1} dari ${parts}`
                      )}
                    </a>
                  );
                })
              : null}
          </div>
        </div>

        {parts > 1 ? (
          <p className="text-xs text-cream/50">
            Foto dibagi per {ZIP_PART_SIZE} supaya unduhan tidak terputus. Unduh semua bagian;
            tanda centang menandai bagian yang sudah kamu klik.
          </p>
        ) : null}

        {firstLoad ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="aspect-square w-full" />
            ))}
          </div>
        ) : items.length === 0 && loadError ? (
          <EmptyState
            icon={<WarningCircleIcon weight="duotone" />}
            title="Foto gagal dimuat"
            action={<Button variant="secondary" onClick={retry}>Coba lagi</Button>}
          >
            {loadError}
          </EmptyState>
        ) : items.length === 0 ? (
          <EmptyState icon={<ImagesIcon weight="duotone" />} title="Belum ada foto">
            {activeGuest
              ? "Tamu ini belum punya foto yang tampil di galeri."
              : "Foto dari tamu muncul di sini begitu mereka mulai memotret."}
          </EmptyState>
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {items.map((photo, index) => (
                <li key={photo.id}>
                  <button
                    type="button"
                    onClick={() => openAt(index)}
                    className="group relative block aspect-square w-full overflow-hidden rounded-xl bg-shell-3"
                  >
                    {photo.thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo.thumbUrl}
                        alt={`Foto oleh ${photo.guestName}`}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.04]"
                      />
                    ) : null}
                    <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-shell/90 via-shell/40 to-transparent px-2.5 pt-6 pb-2 text-left text-xs font-medium text-cream/90 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
                      {photo.guestName}
                    </span>
                  </button>
                </li>
              ))}
              {loading
                ? Array.from({ length: 4 }, (_, index) => (
                    <li key={`memuat-${index}`}>
                      <Skeleton className="aspect-square w-full" />
                    </li>
                  ))
                : null}
            </ul>

            {loadError ? (
              <div className="flex flex-wrap items-center gap-3 text-sm text-danger">
                <WarningCircleIcon className="size-4" weight="fill" aria-hidden />
                {loadError}
                <Button size="sm" variant="secondary" onClick={retry}>
                  Coba lagi
                </Button>
              </div>
            ) : null}
          </>
        )}

        <div ref={sentinelRef} className="h-px" />
      </section>

      {/* Panel filter tamu di HP */}
      <AnimatePresence>
        {filterOpen ? (
          <m.div
            key="filter"
            className="fixed inset-0 z-(--z-sheet) bg-shell/80 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFilterOpen(false)}
          >
            <m.div
              role="dialog"
              aria-modal="true"
              aria-label="Pilih tamu"
              className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-line-strong bg-shell-2 px-4 pt-3 pb-6 safe-bottom"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-cream/20" />
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold">Pilih tamu</h2>
                <button
                  type="button"
                  onClick={() => setFilterOpen(false)}
                  aria-label="Tutup"
                  className="flex size-9 items-center justify-center rounded-lg text-cream/60 hover:bg-cream/5"
                >
                  <XIcon className="size-5" aria-hidden />
                </button>
              </div>
              {guestList}
            </m.div>
          </m.div>
        ) : null}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && current ? (
          <m.div
            key="lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={`Foto oleh ${current.guestName}`}
            className="fixed inset-0 z-(--z-sheet) flex flex-col bg-shell/95 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 safe-top sm:px-6">
              <p className="font-mono text-xs text-cream/50 tabular-nums">
                {lightbox.index + 1} / {items.length}
                {!done ? "+" : ""}
              </p>
              <button
                type="button"
                onClick={close}
                aria-label="Tutup"
                className="flex size-10 items-center justify-center rounded-xl text-cream/70 transition hover:bg-cream/[0.06] hover:text-cream"
              >
                <XIcon className="size-5" aria-hidden />
              </button>
            </div>

            <div
              className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 sm:px-20"
              onClick={close}
              onTouchStart={(event) => {
                touchStartRef.current = event.touches[0]?.clientX ?? null;
              }}
              onTouchEnd={(event) => {
                const start = touchStartRef.current;
                touchStartRef.current = null;
                const end = event.changedTouches[0]?.clientX;
                if (start === null || end === undefined) return;
                const delta = end - start;
                if (delta < -50) openAt(lightbox.index + 1, 1);
                else if (delta > 50) openAt(lightbox.index - 1, -1);
              }}
            >
              <AnimatePresence initial={false} custom={lightbox.direction} mode="popLayout">
                {current.url ? (
                  <m.img
                    key={current.id}
                    src={current.url}
                    alt={`Foto oleh ${current.guestName}`}
                    custom={lightbox.direction}
                    variants={{
                      enter: (direction: number) => ({ opacity: 0, x: direction * 60 }),
                      center: { opacity: 1, x: 0 },
                      exit: (direction: number) => ({ opacity: 0, x: direction * -60 }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: "spring", stiffness: 380, damping: 38 }}
                    onClick={(event) => event.stopPropagation()}
                    className="max-h-full max-w-full rounded-lg object-contain shadow-[0_30px_80px_-20px_rgb(0_0_0/0.9)]"
                  />
                ) : null}
              </AnimatePresence>

              <button
                type="button"
                aria-label="Foto sebelumnya"
                disabled={lightbox.index === 0}
                onClick={(event) => {
                  event.stopPropagation();
                  openAt(lightbox.index - 1, -1);
                }}
                className="absolute left-3 hidden size-12 items-center justify-center rounded-full border border-line-strong bg-shell-2/80 text-cream transition hover:border-film/50 disabled:opacity-0 sm:flex"
              >
                <CaretLeftIcon className="size-5" weight="bold" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Foto berikutnya"
                disabled={lightbox.index >= items.length - 1}
                onClick={(event) => {
                  event.stopPropagation();
                  openAt(lightbox.index + 1, 1);
                }}
                className="absolute right-3 hidden size-12 items-center justify-center rounded-full border border-line-strong bg-shell-2/80 text-cream transition hover:border-film/50 disabled:opacity-0 sm:flex"
              >
                <CaretRightIcon className="size-5" weight="bold" aria-hidden />
              </button>
            </div>

            <div className="mx-auto flex w-full max-w-3xl flex-wrap items-end justify-between gap-4 px-4 pt-4 pb-5 safe-bottom sm:px-6">
              <div className="min-w-0 space-y-1">
                <p className="font-medium">{current.guestName}</p>
                <p className="text-xs text-cream/50">
                  {new Date(current.takenAt ?? current.createdAt).toLocaleString("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  {current.tableLabel ? `, ${current.tableLabel}` : ""}
                </p>
                {current.caption ? (
                  <p className="max-w-[60ch] pt-1 text-sm leading-relaxed text-cream/80">
                    &ldquo;{current.caption}&rdquo;
                  </p>
                ) : null}
                {hideError ? <p className="pt-1 text-sm text-danger">{hideError}</p> : null}
              </div>

              {canManage ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirmHide(true)}
                  icon={<EyeSlashIcon className="size-4" aria-hidden />}
                >
                  Sembunyikan
                </Button>
              ) : null}
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>

      <Dialog
        open={confirmHide}
        title="Sembunyikan foto ini?"
        confirmLabel="Sembunyikan"
        busy={hiding}
        onConfirm={() => void hideCurrent()}
        onCancel={() => setConfirmHide(false)}
      >
        Foto tidak tampil di galeri dan tidak ikut dalam unduhan ZIP.
      </Dialog>
    </div>
  );
}

function GuestRow({
  label,
  sub,
  count,
  active,
  onSelect,
}: {
  label: string;
  sub?: string;
  count: number;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-150 ${
        active ? "bg-film/15 text-film" : "text-cream/80 hover:bg-cream/[0.05] hover:text-cream"
      }`}
    >
      <span className="min-w-0">
        <span className="block truncate font-medium">{label}</span>
        {sub ? <span className="block truncate text-xs text-cream/45">{sub}</span> : null}
      </span>
      <span
        className={`font-mono text-xs tabular-nums ${active ? "text-film" : "text-cream/45"}`}
      >
        {count}
      </span>
    </button>
  );
}
