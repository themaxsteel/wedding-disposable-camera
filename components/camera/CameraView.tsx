"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import {
  CameraRotateIcon,
  LightningIcon,
  LightningSlashIcon,
} from "@phosphor-icons/react/ssr";
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
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [screenFlash, setScreenFlash] = useState(false);
  const [blink, setBlink] = useState(false);
  const [shotKey, setShotKey] = useState(0);
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
      setOffline(state.offline);
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
      setToast({ message: "Foto tersimpan", tone: "ok" });
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
    setShotKey(now);

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
    <main className="camera-surface relative flex h-dvh flex-col bg-shell">
      <header className="flex items-center justify-between gap-3 px-4 pb-1 safe-top">
        <FilmCounter
          remaining={remaining}
          limit={session.filmLimit}
          pending={pending}
          offline={offline}
        />
        <div className="min-w-0 text-right">
          <p className="max-w-40 truncate text-sm font-medium text-cream/85">
            {session.displayName}
          </p>
          {session.tableLabel ? (
            <p className="truncate font-mono text-[11px] text-cream/45">{session.tableLabel}</p>
          ) : null}
        </div>
      </header>

      <div className="viewfinder-frame relative mx-3 my-2 flex-1 overflow-hidden rounded-[28px] bg-shell-2">
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

        {/* Tanda sudut ala jendela bidik optik */}
        <div aria-hidden className="pointer-events-none absolute inset-6">
          <span className="absolute top-0 left-0 size-6 rounded-tl-lg border-t-2 border-l-2 border-cream/45" />
          <span className="absolute top-0 right-0 size-6 rounded-tr-lg border-t-2 border-r-2 border-cream/45" />
          <span className="absolute bottom-0 left-0 size-6 rounded-bl-lg border-b-2 border-l-2 border-cream/45" />
          <span className="absolute right-0 bottom-0 size-6 rounded-br-lg border-r-2 border-b-2 border-cream/45" />
        </div>

        {blink ? (
          <div className="flash-pop pointer-events-none absolute inset-0 bg-cream" />
        ) : null}
      </div>

      <div className="flex items-center justify-around px-6 pt-3 pb-4 safe-bottom">
        <IconButton
          label={flashOn ? "Matikan flash" : "Nyalakan flash"}
          active={flashOn}
          onPress={() => setFlashOn((value) => !value)}
        >
          {flashOn ? (
            <LightningIcon weight="fill" aria-hidden />
          ) : (
            <LightningSlashIcon aria-hidden />
          )}
        </IconButton>

        <ShutterButton
          onPress={() => void capture()}
          disabled={busy}
          busy={busy}
          shotKey={shotKey}
        />

        <IconButton label="Putar kamera" onPress={() => void flipCamera()} disabled={busy}>
          <CameraRotateIcon aria-hidden />
        </IconButton>
      </div>

      {/* Flash layar untuk perangkat tanpa torch */}
      {screenFlash ? (
        <div className="pointer-events-none fixed inset-0 z-(--z-flash) bg-white" />
      ) : null}

      <Toast
        message={toast?.message ?? null}
        tone={toast?.tone}
        onDone={() => setToast(null)}
      />

      <AnimatePresence>
        {captionFor !== null ? (
          <CaptionSheet key={captionFor} onClose={(caption) => void closeCaption(caption)} />
        ) : null}
      </AnimatePresence>
    </main>
  );
}
