"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCameraStream } from "@/lib/camera/useCameraStream";
import {
  frameFromFile,
  grabFrame,
  makeThumbnail,
  THUMB_QUALITY,
  toJpegBlob,
} from "@/lib/camera/capture";
import { applyFilmLook } from "@/lib/camera/filmFilter";
import {
  playShutterSound,
  unlockAudio,
  vibrateShutter,
} from "@/lib/camera/shutterSound";
import { getUploader } from "@/lib/upload/uploader";
import { CAPTION_GRACE_MS, releaseJob } from "@/lib/upload/queue";
import PermissionGate from "@/components/camera/PermissionGate";
import FilmCounter from "@/components/camera/FilmCounter";
import ShutterButton from "@/components/camera/ShutterButton";
import IconButton from "@/components/camera/IconButton";
import CaptionSheet from "@/components/camera/CaptionSheet";
import Toast from "@/components/camera/Toast";
import type { GuestSessionInfo } from "@/lib/types";

/** Jeda antar jepretan di sisi client; server menolak klaim film di bawah 400 ms (MIN_SHOT_INTERVAL_MS). */
const SHOT_COOLDOWN_MS = 1500;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function CameraView({ session }: { session: GuestSessionInfo }) {
  const router = useRouter();
  // Didestrukturisasi: ref yang dibungkus objek tidak dikenali React Compiler
  // sebagai ref biasa, dan itu memicu peringatan akses ref saat render.
  const {
    videoRef,
    attachVideo,
    status,
    everLive,
    errorKind,
    facing,
    start: startCamera,
    flip: flipCamera,
    pulseTorch,
  } = useCameraStream("environment");

  const [remaining, setRemaining] = useState(session.remaining);
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [screenFlash, setScreenFlash] = useState(false);
  const [blink, setBlink] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "ok" | "warn" } | null>(
    null,
  );
  const [captionFor, setCaptionFor] = useState<string | null>(null);

  const lastShotRef = useRef(0);
  const captionForRef = useRef<string | null>(null);

  // --- Antrean upload -------------------------------------------------
  useEffect(() => {
    const uploader = getUploader();
    uploader.setRemaining(session.remaining);
    uploader.bind();

    return uploader.subscribe((state) => {
      setPending(state.pending);
      // Hitungan lokal sudah memotong jepretan yang masih mengantre, jadi nilai
      // server hanya boleh mengoreksi ke bawah — kalau tidak, counter sempat
      // naik lagi setiap satu upload selesai.
      if (typeof state.remaining === "number") {
        const fromServer = state.remaining;
        setRemaining((current) => Math.min(current, fromServer));
      }

      if (state.fatal === "FILM_HABIS") {
        router.replace(`/e/${session.eventSlug}/selesai`);
      } else if (state.fatal === "SESI_TIDAK_VALID" || state.fatal === "EVENT_TUTUP") {
        router.replace(`/e/${session.eventSlug}`);
      }
    });
  }, [router, session.eventSlug, session.remaining]);

  useEffect(() => {
    captionForRef.current = captionFor;
  }, [captionFor]);

  // Caption yang belum ditutup tidak boleh menahan upload selamanya.
  const closeCaption = useCallback(async (caption: string | null) => {
    const id = captionForRef.current;
    captionForRef.current = null;
    setCaptionFor(null);
    if (!id) return;
    await releaseJob(id, caption);
    void getUploader().drain();
  }, []);

  // --- Menjepret ------------------------------------------------------
  const processFrame = useCallback(
    async (
      frame: { canvas: HTMLCanvasElement; width: number; height: number },
      source: "camera" | "upload",
    ) => {
      const filmCanvas = applyFilmLook(frame.canvas, {
        preset: session.filmPreset,
        dateStamp: new Date(),
      });

      const [origBlob, filmBlob, origThumb, filmThumb] = await Promise.all([
        toJpegBlob(frame.canvas),
        toJpegBlob(filmCanvas).catch(() => null),
        toJpegBlob(makeThumbnail(frame.canvas), THUMB_QUALITY).catch(() => null),
        toJpegBlob(makeThumbnail(filmCanvas), THUMB_QUALITY).catch(() => null),
      ]);

      const clientPhotoId = crypto.randomUUID();
      const now = Date.now();

      await getUploader().enqueue({
        clientPhotoId,
        orig: origBlob,
        film: filmBlob,
        origThumb,
        filmThumb,
        caption: null,
        takenAt: new Date(now).toISOString(),
        facing: source === "camera" ? facing : null,
        source,
        width: frame.width,
        height: frame.height,
        attempts: 0,
        // Ditahan sebentar supaya caption ikut dalam satu commit.
        nextAttemptAt: now + CAPTION_GRACE_MS,
        createdAt: now,
      });

      setRemaining((value) => Math.max(0, value - 1));
      setToast({ message: "Foto tersimpan!", tone: "ok" });
      captionForRef.current = clientPhotoId;
      setCaptionFor(clientPhotoId);
    },
    [facing, session.filmPreset],
  );

  const capture = useCallback(async () => {
    if (busy || remaining <= 0) return;
    const now = Date.now();
    if (now - lastShotRef.current < SHOT_COOLDOWN_MS) return;
    lastShotRef.current = now;

    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      setToast({ message: "Kamera belum siap, tunggu sebentar.", tone: "warn" });
      return;
    }

    // Caption foto sebelumnya dilepas otomatis begitu tamu menjepret lagi.
    if (captionForRef.current) await closeCaption(null);

    setBusy(true);
    try {
      playShutterSound();
      vibrateShutter();

      if (flashOn) {
        const torched = await pulseTorch(320);
        if (!torched) {
          // Tanpa torch (iOS): layar putih sebagai sumber cahaya, berguna untuk selfie.
          setScreenFlash(true);
          await delay(140);
        } else {
          await delay(120); // beri waktu auto-exposure menyesuaikan
        }
      }

      const frame = grabFrame(video);

      setScreenFlash(false);
      setBlink(true);
      setTimeout(() => setBlink(false), 320);

      await processFrame(frame, "camera");
    } catch {
      setToast({ message: "Gagal mengambil foto. Coba lagi.", tone: "warn" });
    } finally {
      setScreenFlash(false);
      setBusy(false);
    }
  }, [busy, closeCaption, flashOn, processFrame, pulseTorch, remaining, videoRef]);

  const handlePickFile = useCallback(
    async (file: File) => {
      if (remaining <= 0) return;
      setBusy(true);
      try {
        const frame = await frameFromFile(file);
        await processFrame(frame, "upload");
      } catch {
        setToast({ message: "File itu tidak bisa dibaca.", tone: "warn" });
      } finally {
        setBusy(false);
      }
    },
    [processFrame, remaining],
  );

  // Film habis: keluar dari layar kamera, antrean tetap jalan di background.
  useEffect(() => {
    if (remaining > 0) return;
    const timer = setTimeout(
      () => router.replace(`/e/${session.eventSlug}/selesai`),
      900,
    );
    return () => clearTimeout(timer);
  }, [remaining, router, session.eventSlug]);

  const handleStart = useCallback(() => {
    unlockAudio(); // harus dipanggil di dalam gesture pengguna
    void startCamera();
  }, [startCamera]);

  // Layar izin hanya untuk sebelum kamera pertama kali hidup. Saat putar
  // kamera (status sementara "starting"), viewfinder tetap di tempat.
  const showGate = status === "idle" || status === "error" || (status === "starting" && !everLive);

  if (showGate) {
    return (
      <PermissionGate
        status={status}
        errorKind={errorKind}
        coupleNames={session.coupleNames}
        onStart={handleStart}
        onPickFile={handlePickFile}
      />
    );
  }

  return (
    <main className="camera-surface relative flex h-dvh flex-col bg-black">
      <header className="flex items-center justify-between px-4 safe-top">
        <FilmCounter remaining={remaining} limit={session.filmLimit} pending={pending} />
        <div className="text-right">
          <p className="max-w-36 truncate text-sm text-cream/80">
            {session.displayName}
          </p>
          {session.tableLabel ? (
            <p className="font-mono text-[10px] text-cream/35">{session.tableLabel}</p>
          ) : null}
        </div>
      </header>

      <div className="relative mx-4 my-3 flex-1 overflow-hidden rounded-2xl bg-shell-2 viewfinder-frame">
        <video
          ref={attachVideo}
          playsInline
          muted
          autoPlay
          className="h-full w-full object-cover"
          style={{
            transform: facing === "user" ? "scaleX(-1)" : undefined,
          }}
        />

        {/* Bingkai bidik ala jendela bidik optik */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-2/3 w-2/3 rounded-lg border border-cream/20" />
        </div>

        {blink ? (
          <div className="flash-pop pointer-events-none absolute inset-0 bg-white" />
        ) : null}
      </div>

      <div className="flex items-center justify-between px-8 pb-4 safe-bottom">
        <IconButton
          label={flashOn ? "Matikan flash" : "Nyalakan flash"}
          active={flashOn}
          onPress={() => setFlashOn((value) => !value)}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
            <path
              d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z"
              fill="currentColor"
              opacity={flashOn ? 1 : 0.45}
            />
            {!flashOn ? (
              <path d="M4 20 20 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            ) : null}
          </svg>
        </IconButton>

        <ShutterButton onPress={() => void capture()} disabled={busy} busy={busy} />

        <IconButton label="Putar kamera" onPress={() => void flipCamera()} disabled={busy}>
          <span className="text-lg" aria-hidden>
            {"⟳"}
          </span>
        </IconButton>
      </div>

      {/* Flash layar untuk perangkat tanpa torch */}
      {screenFlash ? (
        <div className="pointer-events-none fixed inset-0 z-50 bg-white" />
      ) : null}

      <Toast
        message={toast?.message ?? null}
        tone={toast?.tone}
        onDone={() => setToast(null)}
      />

      <CaptionSheet
        key={captionFor ?? "kosong"}
        open={captionFor !== null}
        onClose={(caption) => void closeCaption(caption)}
      />
    </main>
  );
}
