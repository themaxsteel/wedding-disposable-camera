"use client";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { PHOTO_BUCKET } from "@/lib/env";
import { allJobs, deleteJob, putJob, type UploadJob } from "@/lib/upload/queue";
import type { ApiErrorCode } from "@/lib/types";

const CONCURRENCY = 2;
const MAX_BACKOFF_MS = 60_000;
const BASE_BACKOFF_MS = 2_000;
/** Setelah sekian kali gagal, job dianggap busuk dan dibuang agar antrean tidak macet. */
const MAX_ATTEMPTS = 12;

export interface UploaderState {
  pending: number;
  uploading: number;
  failing: boolean;
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
    window.addEventListener("online", poke);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") poke();
    });
    window.addEventListener("beforeunload", (event) => {
      if (this.state.pending > 0) {
        event.preventDefault();
        event.returnValue = "";
      }
    });
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
          this.patch({ failing: false });
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
      this.patch({ failing: false });
    } catch (error) {
      const { fatalCode: fatal, retryAfterMs } = error as {
        fatalCode?: ApiErrorCode;
        retryAfterMs?: number;
      };

      if (retryAfterMs) {
        await putJob({ ...job, nextAttemptAt: Date.now() + retryAfterMs });
        this.scheduleDrain(retryAfterMs);
      } else if (fatal) {
        // Film habis / sesi mati: mengulang tidak akan pernah berhasil.
        await deleteJob(job.clientPhotoId);
        this.patch({ fatal });
      } else {
        const attempts = job.attempts + 1;
        if (attempts >= MAX_ATTEMPTS) {
          await deleteJob(job.clientPhotoId);
        } else {
          const backoff = Math.min(
            MAX_BACKOFF_MS,
            BASE_BACKOFF_MS * 2 ** (attempts - 1),
          );
          const jitter = Math.random() * 0.3 * backoff;
          await putJob({
            ...job,
            attempts,
            nextAttemptAt: Date.now() + backoff + jitter,
          });
        }
        this.patch({ failing: true });
      }
    } finally {
      this.inFlight.delete(job.clientPhotoId);
      await this.refreshCount();
      this.patch({ uploading: this.inFlight.size });
    }
  }

  private async uploadOne(job: UploadJob) {
    const initResponse = await fetch("/api/photos/init", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clientPhotoId: job.clientPhotoId,
        takenAt: job.takenAt,
        facing: job.facing,
        source: job.source,
        withFiltered: job.film !== null,
        withThumbs: Boolean(job.origThumb),
      }),
    });

    const init = await initResponse.json().catch(() => null);

    if (!initResponse.ok || !init?.ok) {
      const code: ApiErrorCode = init?.code ?? "GAGAL";
      if (code === "FILM_HABIS" || code === "SESI_TIDAK_VALID" || code === "EVENT_TUTUP") {
        throw Object.assign(new Error(code), { fatalCode: code });
      }
      // Tabrakan rate limit antar upload paralel: coba lagi sebentar lagi,
      // tanpa menambah hitungan kegagalan job ini.
      if (code === "TERLALU_CEPAT") {
        throw Object.assign(new Error(code), { retryAfterMs: 700 });
      }
      throw new Error(code);
    }

    if (typeof init.remaining === "number") {
      this.patch({ remaining: init.remaining });
    }

    const storage = getSupabaseBrowser().storage.from(PHOTO_BUCKET);

    const origUpload = await storage.uploadToSignedUrl(
      init.orig.path,
      init.orig.token,
      job.orig,
      { contentType: "image/jpeg" },
    );
    if (origUpload.error) throw origUpload.error;

    let filteredUploaded = false;
    if (job.film && init.film) {
      const filmUpload = await storage.uploadToSignedUrl(
        init.film.path,
        init.film.token,
        job.film,
        { contentType: "image/jpeg" },
      );
      // Versi berfilter itu bonus; kalau gagal, foto asli tetap tersimpan.
      filteredUploaded = !filmUpload.error;
    }

    // Thumbnail juga bonus: galeri kembali memakai file penuh kalau gagal.
    // Dianggap lengkap hanya bila setiap varian yang tersimpan punya thumbnail.
    let thumbsUploaded = false;
    if (job.origThumb && init.origThumb) {
      const origThumbUpload = await storage.uploadToSignedUrl(
        init.origThumb.path,
        init.origThumb.token,
        job.origThumb,
        { contentType: "image/jpeg" },
      );
      thumbsUploaded = !origThumbUpload.error;

      if (thumbsUploaded && filteredUploaded) {
        if (job.filmThumb && init.filmThumb) {
          const filmThumbUpload = await storage.uploadToSignedUrl(
            init.filmThumb.path,
            init.filmThumb.token,
            job.filmThumb,
            { contentType: "image/jpeg" },
          );
          thumbsUploaded = !filmThumbUpload.error;
        } else {
          thumbsUploaded = false;
        }
      }
    }

    const commitResponse = await fetch("/api/photos/commit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        photoId: init.photoId,
        caption: job.caption,
        width: job.width,
        height: job.height,
        bytes: job.orig.size,
        filteredUploaded,
        thumbsUploaded,
      }),
    });
    if (!commitResponse.ok) throw new Error("COMMIT_GAGAL");
  }
}

let instance: Uploader | null = null;

export function getUploader(): Uploader {
  if (!instance) instance = new Uploader();
  return instance;
}
