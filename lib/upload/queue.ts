"use client";
import { openDB, type IDBPDatabase } from "idb";
import type { Facing } from "@/lib/types";

const DB_NAME = "dcam-queue";
const STORE = "jobs";
const DB_VERSION = 1;

export interface UploadJob {
  clientPhotoId: string;
  orig: Blob;
  film: Blob | null;
  /** Opsional: job lama di IndexedDB dari versi sebelum ada thumbnail. */
  origThumb?: Blob | null;
  filmThumb?: Blob | null;
  caption: string | null;
  takenAt: string;
  facing: Facing | null;
  source: "camera" | "upload";
  width: number;
  height: number;
  /** Kegagalan dengan respons server — hanya untuk mengatur jeda, tidak pernah membuang job. */
  attempts: number;
  /** Kegagalan tanpa respons (offline) — hanya untuk mengatur jeda. Opsional untuk job lama. */
  networkRetries?: number;
  nextAttemptAt: number;
  createdAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "clientPhotoId" });
          store.createIndex("createdAt", "createdAt");
        }
      },
    });
  }
  return dbPromise;
}

export async function putJob(job: UploadJob): Promise<void> {
  const db = await getDb();
  await db.put(STORE, job);
}

export async function deleteJob(clientPhotoId: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, clientPhotoId);
}

export async function allJobs(): Promise<UploadJob[]> {
  const db = await getDb();
  const jobs = (await db.getAllFromIndex(STORE, "createdAt")) as UploadJob[];
  return jobs;
}

export async function countJobs(): Promise<number> {
  const db = await getDb();
  return db.count(STORE);
}

/**
 * Job baru ditahan sebentar supaya caption sempat ditulis dan ikut
 * terkirim dalam satu commit. Kalau tamu keburu menutup tab, jeda ini
 * lewat dengan sendirinya dan foto tetap terunggah tanpa caption.
 */
export const CAPTION_GRACE_MS = 12_000;

/** Lepas tahanan job (caption sudah diisi atau dilewati). */
export async function releaseJob(
  clientPhotoId: string,
  caption: string | null,
): Promise<void> {
  const db = await getDb();
  const job = (await db.get(STORE, clientPhotoId)) as UploadJob | undefined;
  if (!job) return;
  job.caption = caption?.trim() ? caption.trim().slice(0, 200) : null;
  job.nextAttemptAt = Date.now();
  await db.put(STORE, job);
}
