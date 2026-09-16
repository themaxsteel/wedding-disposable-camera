"use client";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { PHOTO_BUCKET } from "@/lib/env";
import { allJobs, deleteJob, putJob, type UploadJob } from "@/lib/upload/queue";
import type { ApiErrorCode } from "@/lib/types";

const CONCURRENCY = 2;
const BASE_BACKOFF_MS = 2_000;
/** Jaringan putus: coba lagi cukup sering supaya foto terkirim begitu sinyal kembali. */
const MAX_NETWORK_BACKOFF_MS = 30_000;
/** Server menolak / error: melambat, tapi tidak pernah menyerah. */
const MAX_SERVER_BACKOFF_MS = 5 * 60_000;
/** Saat browser melaporkan offline, cek ulang sesekali selain menunggu event "online". */
const OFFLINE_RECHECK_MS = 15_000;
const RATE_LIMIT_RETRY_MS = 700;

/**
 * - network  : tidak ada respons HTTP (offline, WiFi tanpa internet, koneksi terputus)
 * - server   : ada respons tapi gagal (5xx, 4xx tak terduga, token upload kedaluwarsa)
 * - retrySoon: tabrakan rate limit antar upload paralel
 * - fatal    : mengulang tidak akan pernah berhasil (film habis, sesi mati, acara tutup)
 *
 * Hanya "fatal" yang boleh membuang foto dari antrean.
 */
type FailureKind = "network" | "server" | "retrySoon" | "fatal";

class UploadFailure extends Error {
  constructor(
    readonly kind: FailureKind,
    message: string,
    readonly code?: ApiErrorCode,
  ) {
    super(message);
  }
}

const FATAL_CODES: ApiErrorCode[] = ["FILM_HABIS", "SESI_TIDAK_VALID", "EVENT_TUTUP"];

function browserOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/** Apakah error ini berarti permintaan tidak pernah mendapat respons HTTP. */
function isNetworkError(error: unknown): boolean {
  if (browserOffline()) return true;
  // fetch() menolak dengan TypeError ketika tidak ada respons sama sekali.
  if (error instanceof TypeError) return true;

  const candidate = error as {
    name?: string;
    message?: string;
    originalError?: unknown;
  } | null;
  if (!candidate) return false;
  if (candidate.originalError && isNetworkError(candidate.originalError)) return true;
  // storage-js: StorageApiError = ada respons HTTP; StorageUnknownError = tidak ada.
  if (candidate.name === "StorageUnknownError") return true;
  return /failed to fetch|networkerror|load failed|network request failed|network connection was lost/i.test(
    candidate.message ?? "",
  );
}

function toFailure(error: unknown): UploadFailure {
  if (error instanceof UploadFailure) return error;
  return isNetworkError(error)
    ? new UploadFailure("network", "Jaringan tidak tersedia.")
    : new UploadFailure("server", error instanceof Error ? error.message : "Upload gagal.");
}

async function postJson(url: string, body: unknown) {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw toFailure(error);
  }

  const data = await response.json().catch(() => null);
  if (response.ok && data?.ok) return data;

  const code: ApiErrorCode = data?.code ?? "GAGAL";
  if (FATAL_CODES.includes(code)) throw new UploadFailure("fatal", code, code);
  if (code === "TERLALU_CEPAT") throw new UploadFailure("retrySoon", code, code);
  throw new UploadFailure("server", `${url} → HTTP ${response.status}`, code);
}

function withJitter(ms: number): number {
  return ms + Math.random() * 0.3 * ms;
}

export interface UploaderState {
  pending: number;
  uploading: number;
  failing: boolean;
  /** Server tidak bisa dihubungi — foto tetap aman di HP dan akan dikirim ulang. */
  offline: boolean;
  /** Sisa jatah film menurut server — sumber kebenaran untuk counter di UI. */
  remaining: number | null;
  fatal: ApiErrorCode | null;
}

type Listener = (state: UploaderState) => void;

class Uploader {
  private listeners = new Set<Listener>();
  private inFlight = new Set<string>();
  private draining = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private bound = false;

  private state: UploaderState = {
    pending: 0,
    uploading: 0,
    failing: false,
    offline: false,
    remaining: null,
    fatal: null,
  };

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  getState(): UploaderState {
    return this.state;
  }

  setRemaining(remaining: number | null) {
    this.patch({ remaining });
  }

  private patch(partial: Partial<UploaderState>) {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) listener(this.state);
  }

  /** Dipasang sekali dari layar kamera. */
  bind() {
    if (this.bound || typeof window === "undefined") return;
    this.bound = true;

    const poke = () => void this.drain();
    window.addEventListener("online", () => {
      this.patch({ offline: false });
      poke();
    });
    window.addEventListener("offline", () => this.patch({ offline: true }));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") poke();
    });
    window.addEventListener("beforeunload", (event) => {
      if (this.state.pending > 0) {
        event.preventDefault();
        event.returnValue = "";
      }
    });
    this.patch({ offline: browserOffline() });
    poke();
  }

  async enqueue(job: UploadJob) {
    await putJob(job);
    await this.refreshCount();
    this.scheduleDrain(0);
  }

  async refreshCount() {
    const jobs = await allJobs();
    this.patch({ pending: jobs.length });
  }

  private scheduleDrain(delay: number) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.drain();
    }, Math.max(0, delay));
  }

  async drain(): Promise<void> {
    if (this.draining) return;
    this.draining = true;

    try {
      while (true) {
        const jobs = await allJobs();
        this.patch({ pending: jobs.length, uploading: this.inFlight.size });
        if (jobs.length === 0) {
          this.patch({ failing: false, offline: browserOffline() });
          return;
        }

        // Tidak ada gunanya mencoba saat browser tahu dirinya offline.
        if (browserOffline()) {
          this.patch({ offline: true });
          this.scheduleDrain(OFFLINE_RECHECK_MS);
          return;
        }

        const now = Date.now();
        const ready = jobs.filter(
          (job) => !this.inFlight.has(job.clientPhotoId) && job.nextAttemptAt <= now,
        );

        if (ready.length === 0) {
          const soonest = Math.min(
            ...jobs
              .filter((job) => !this.inFlight.has(job.clientPhotoId))
              .map((job) => job.nextAttemptAt),
          );
          if (Number.isFinite(soonest)) this.scheduleDrain(soonest - now);
          return;
        }

        const batch = ready.slice(0, Math.max(0, CONCURRENCY - this.inFlight.size));
        if (batch.length === 0) return;

        await Promise.all(batch.map((job) => this.runJob(job)));
      }
    } finally {
      this.draining = false;
    }
  }

  private async runJob(job: UploadJob) {
    this.inFlight.add(job.clientPhotoId);
    this.patch({ uploading: this.inFlight.size });

    try {
      await this.uploadOne(job);
      await deleteJob(job.clientPhotoId);
      this.patch({ failing: false, offline: false });
    } catch (error) {
      const failure = toFailure(error);

      switch (failure.kind) {
        case "fatal":
          await deleteJob(job.clientPhotoId);
          this.patch({ fatal: failure.code ?? null });
          break;

        case "retrySoon":
          await putJob({ ...job, nextAttemptAt: Date.now() + RATE_LIMIT_RETRY_MS });
          this.scheduleDrain(RATE_LIMIT_RETRY_MS);
          break;

        case "network": {
          // Tidak dihitung sebagai percobaan gagal: sinyal yang hilang bukan
          // kesalahan fotonya. networkRetries hanya mengatur jeda.
          const networkRetries = (job.networkRetries ?? 0) + 1;
          const delay = withJitter(
            Math.min(MAX_NETWORK_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** (networkRetries - 1)),
          );
          await putJob({ ...job, networkRetries, nextAttemptAt: Date.now() + delay });
          this.patch({ failing: true, offline: true });
          break;
        }

        case "server": {
          const attempts = job.attempts + 1;
          const delay = withJitter(
            Math.min(MAX_SERVER_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** (attempts - 1)),
          );
          await putJob({ ...job, attempts, nextAttemptAt: Date.now() + delay });
          this.patch({ failing: true, offline: false });
          break;
        }
      }
    } finally {
      this.inFlight.delete(job.clientPhotoId);
      await this.refreshCount();
      this.patch({ uploading: this.inFlight.size });
    }
  }

  /**
   * Unggah satu file. File utama wajib berhasil. File "bonus" (versi film,
   * thumbnail) boleh gagal karena server — foto asli tetap tersimpan — tapi
   * kalau gagal karena jaringan, seluruh job diulang: melanjutkan ke commit
   * justru membuat versi itu hilang permanen.
   */
  private async upload(
    target: { path: string; token: string },
    blob: Blob,
    required: boolean,
  ): Promise<boolean> {
    const storage = getSupabaseBrowser().storage.from(PHOTO_BUCKET);
    let error: unknown = null;
    try {
      ({ error } = await storage.uploadToSignedUrl(target.path, target.token, blob, {
        contentType: "image/jpeg",
      }));
    } catch (thrown) {
      error = thrown;
    }

    if (!error) return true;
    if (required || isNetworkError(error)) throw toFailure(error);
    return false;
  }

  private async uploadOne(job: UploadJob) {
    const init = await postJson("/api/photos/init", {
      clientPhotoId: job.clientPhotoId,
      takenAt: job.takenAt,
      facing: job.facing,
      source: job.source,
      withFiltered: job.film !== null,
      withThumbs: Boolean(job.origThumb),
    });

    if (typeof init.remaining === "number") {
      this.patch({ remaining: init.remaining });
    }

    await this.upload(init.orig, job.orig, true);

    const filteredUploaded =
      job.film && init.film ? await this.upload(init.film, job.film, false) : false;

    // Thumbnail dianggap lengkap hanya bila setiap varian yang tersimpan punya thumbnail.
    let thumbsUploaded = false;
    if (job.origThumb && init.origThumb) {
      thumbsUploaded = await this.upload(init.origThumb, job.origThumb, false);
      if (thumbsUploaded && filteredUploaded) {
        thumbsUploaded =
          job.filmThumb && init.filmThumb
            ? await this.upload(init.filmThumb, job.filmThumb, false)
            : false;
      }
    }

    await postJson("/api/photos/commit", {
      photoId: init.photoId,
      caption: job.caption,
      width: job.width,
      height: job.height,
      bytes: job.orig.size,
      filteredUploaded,
      thumbsUploaded,
    });
  }
}

let instance: Uploader | null = null;

export function getUploader(): Uploader {
  if (!instance) instance = new Uploader();
  return instance;
}
