"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ZIP_PART_SIZE } from "@/lib/env";
import type { AdminPhotoItem, GuestSummaryRow } from "@/lib/types";

type Variant = "orig" | "film";

interface Props {
  eventId: string;
  guests: GuestSummaryRow[];
  totalPhotos: number;
  /** Anggota "lihat saja" tidak boleh menyembunyikan foto. */
  canManage: boolean;
}

export default function Gallery({ eventId, guests, totalPhotos, canManage }: Props) {
  const [activeGuest, setActiveGuest] = useState<string | null>(null);
  const [variant, setVariant] = useState<Variant>("orig");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<AdminPhotoItem[]>([]);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lightbox, setLightbox] = useState<AdminPhotoItem | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  // Halaman yang datang terlambat setelah ganti filter harus dibuang.
  const requestRef = useRef(0);
  const cursorRef = useRef<string | null>(null);
  // Penjaga in-flight pakai ref, bukan state: ganti filter harus tetap
  // bisa memulai permintaan baru walaupun halaman sebelumnya belum selesai.
  const loadingRef = useRef(false);

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

        const response = await fetch(url);
        const data = await response.json().catch(() => null);
        if (token !== requestRef.current) return;

        if (!response.ok || !data?.ok) {
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
    if (next.guest !== undefined) setActiveGuest(next.guest);
    if (next.variant !== undefined) setVariant(next.variant);
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

  async function toggleHidden(photo: AdminPhotoItem) {
    const nextStatus = photo.status === "hidden" ? "ready" : "hidden";
    await fetch(`/api/admin/events/${eventId}/photos`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ photoId: photo.id, status: nextStatus }),
    });
    setItems((previous) => previous.filter((item) => item.id !== photo.id));
    setLightbox(null);
  }

  const selectedCount = activeGuest
    ? (guests.find((guest) => guest.name_key === activeGuest)?.photo_count ?? 0)
    : totalPhotos;
  const parts = Math.max(1, Math.ceil(selectedCount / ZIP_PART_SIZE));

  function downloadUrl(part: number) {
    const query = new URLSearchParams({ variant, part: String(part) });
    if (activeGuest) query.set("guest", activeGuest);
    return `/api/admin/events/${eventId}/download?${query.toString()}`;
  }

  const visibleGuests = guests.filter((guest) =>
    guest.display_name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      {/* Sidebar tamu */}
      <aside className="space-y-3">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari nama tamu…"
          className="w-full rounded-lg border border-cream/15 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-cream/25 focus:border-film/60"
        />

        <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-cream/10 bg-shell-2/50">
          <button
            type="button"
            onClick={() => changeFilter({ guest: null })}
            className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition ${
              activeGuest === null ? "bg-film/15 text-film" : "hover:bg-cream/5"
            }`}
          >
            <span>Semua tamu</span>
            <span className="font-mono text-xs tabular-nums">{totalPhotos}</span>
          </button>

          {visibleGuests.map((guest) => (
            <button
              key={guest.name_key}
              type="button"
              onClick={() => changeFilter({ guest: guest.name_key })}
              className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm transition ${
                activeGuest === guest.name_key
                  ? "bg-film/15 text-film"
                  : "hover:bg-cream/5"
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate">{guest.display_name}</span>
                {guest.table_labels.length > 0 ? (
                  <span className="block truncate font-mono text-[10px] text-cream/35">
                    {guest.table_labels.join(", ")}
                  </span>
                ) : null}
              </span>
              <span className="font-mono text-xs tabular-nums text-cream/50">
                {guest.photo_count}
              </span>
            </button>
          ))}
        </div>
      </aside>

      {/* Konten */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-cream/15 p-0.5">
            {(["orig", "film"] as Variant[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => changeFilter({ variant: value })}
                className={`rounded-md px-3 py-1.5 text-xs transition ${
                  variant === value ? "bg-film text-shell" : "text-cream/60"
                }`}
              >
                {value === "orig" ? "Asli" : "Versi film"}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {Array.from({ length: parts }, (_, index) => (
              <a
                key={index}
                href={downloadUrl(index)}
                className="rounded-lg border border-cream/15 px-3 py-2 text-xs text-cream/70 transition hover:border-film/50 hover:text-cream"
              >
                {parts === 1
                  ? `Unduh ZIP (${selectedCount})`
                  : `ZIP bagian ${index + 1}/${parts}`}
              </a>
            ))}
          </div>
        </div>

        {items.length === 0 && !loading ? (
          <p className="rounded-xl border border-cream/10 bg-shell-2/50 p-8 text-center text-sm text-cream/50">
            Belum ada foto di sini.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setLightbox(photo)}
                className="group relative aspect-square overflow-hidden rounded-lg bg-shell-2"
              >
                {photo.thumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.thumbUrl}
                    alt={`Foto oleh ${photo.guestName}`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                ) : null}
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5 text-left text-[11px] text-cream/90">
                  {photo.guestName}
                </span>
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p className="py-4 text-center font-mono text-xs text-cream/40">memuat…</p>
        ) : null}
        <div ref={sentinelRef} className="h-px" />
      </section>

      {/* Lightbox */}
      {lightbox ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="max-h-full w-full max-w-3xl overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            {lightbox.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lightbox.url}
                alt={`Foto oleh ${lightbox.guestName}`}
                className="mx-auto max-h-[75vh] w-auto rounded-lg object-contain"
              />
            ) : null}

            <div className="mt-4 flex flex-wrap items-start justify-between gap-3 text-sm">
              <div>
                <p className="font-medium">{lightbox.guestName}</p>
                <p className="font-mono text-xs text-cream/40">
                  {new Date(lightbox.takenAt ?? lightbox.createdAt).toLocaleString("id-ID")}
                  {lightbox.tableLabel ? ` · ${lightbox.tableLabel}` : ""}
                </p>
                {lightbox.caption ? (
                  <p className="mt-2 max-w-md text-cream/70">“{lightbox.caption}”</p>
                ) : null}
              </div>

              <div className="flex gap-2">
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => toggleHidden(lightbox)}
                    className="rounded-lg border border-cream/20 px-3 py-2 text-xs text-cream/70 hover:border-film/50"
                  >
                    Sembunyikan
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setLightbox(null)}
                  className="rounded-lg bg-cream/90 px-3 py-2 text-xs font-medium text-shell"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
