"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  classifyCameraError,
  constraintLadder,
  type CameraErrorKind,
} from "@/lib/camera/constraints";
import { hasGetUserMedia, isSecureContextOk } from "@/lib/camera/browserDetect";
import { setTorch, trackSupportsTorch } from "@/lib/camera/torch";
import type { Facing } from "@/lib/types";

export type StreamStatus = "idle" | "starting" | "live" | "error";

export interface CameraStream {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Pasang sebagai `ref` pada <video>. */
  attachVideo: (element: HTMLVideoElement | null) => void;
  status: StreamStatus;
  /** Pernah hidup setidaknya sekali — dipakai agar layar izin tidak muncul lagi saat putar kamera. */
  everLive: boolean;
  errorKind: CameraErrorKind | null;
  facing: Facing;
  torchAvailable: boolean;
  torchOn: boolean;
  start: (facing?: Facing) => Promise<void>;
  stop: () => void;
  flip: () => Promise<void>;
  toggleTorch: () => Promise<void>;
  /** Nyalakan torch sesaat sebagai "flash" ketika menjepret (Android). */
  pulseTorch: (ms?: number) => Promise<boolean>;
}

export function useCameraStream(initialFacing: Facing = "environment"): CameraStream {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startingRef = useRef(false);
  const facingRef = useRef<Facing>(initialFacing);

  const [status, setStatus] = useState<StreamStatus>("idle");
  const [everLive, setEverLive] = useState(false);
  const [errorKind, setErrorKind] = useState<CameraErrorKind | null>(null);
  const [facing, setFacing] = useState<Facing>(initialFacing);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  /**
   * Elemen <video> baru dirender SETELAH stream siap (layar izin diganti
   * viewfinder). Jadi stream harus dipasang saat elemen itu muncul, bukan
   * hanya di dalam start() — di sana elemennya belum ada dan layar jadi hitam.
   */
  const attachVideo = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
    const stream = streamRef.current;
    if (element && stream && element.srcObject !== stream) {
      element.srcObject = stream;
      void element.play().catch(() => {});
    }
  }, []);

  const stop = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
    }
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setTorchOn(false);
    setTorchAvailable(false);
  }, []);

  const start = useCallback(
    async (nextFacing?: Facing) => {
      if (startingRef.current) return;
      startingRef.current = true;

      const wanted = nextFacing ?? facingRef.current;
      facingRef.current = wanted;
      setFacing(wanted);
      setStatus("starting");
      setErrorKind(null);

      try {
        if (!isSecureContextOk()) {
          setErrorKind("tidak_aman");
          setStatus("error");
          return;
        }
        if (!hasGetUserMedia()) {
          setErrorKind("tidak_didukung");
          setStatus("error");
          return;
        }

        // Stream lama harus dimatikan dulu; Android menolak membuka
        // kamera kedua selagi yang pertama masih memegang device.
        stop();

        let stream: MediaStream | null = null;
        let lastError: unknown = null;

        for (const constraints of constraintLadder(wanted)) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            break;
          } catch (error) {
            lastError = error;
            // Izin ditolak: turun level constraint tidak akan menolong.
            if (classifyCameraError(error) === "ditolak") break;
          }
        }

        if (!stream) {
          setErrorKind(classifyCameraError(lastError));
          setStatus("error");
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          // iOS butuh play() eksplisit; autoplay saja tidak cukup andal.
          try {
            await video.play();
          } catch {
            // Tetap lanjut: frame biasanya jalan begitu elemen terlihat.
          }
        }

        const track = stream.getVideoTracks()[0] ?? null;
        setTorchAvailable(trackSupportsTorch(track));
        setEverLive(true);
        setStatus("live");
      } finally {
        startingRef.current = false;
      }
    },
    [stop],
  );

  const flip = useCallback(async () => {
    const next: Facing = facingRef.current === "environment" ? "user" : "environment";
    await start(next);
  }, [start]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0] ?? null;
    const next = !torchOn;
    const applied = await setTorch(track, next);
    if (applied) setTorchOn(next);
  }, [torchOn]);

  const pulseTorch = useCallback(
    async (ms = 220) => {
      const track = streamRef.current?.getVideoTracks()[0] ?? null;
      if (!trackSupportsTorch(track)) return false;
      const applied = await setTorch(track, true);
      if (!applied) return false;
      window.setTimeout(() => void setTorch(track, false), ms);
      return true;
    },
    [],
  );

  // iOS membekukan/mematikan track saat tab ditinggalkan. Tanpa pemulihan ini,
  // tamu yang membalas chat lalu kembali cuma melihat layar hitam.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const track = streamRef.current?.getVideoTracks()[0];
      const dead = !track || track.readyState !== "live" || track.muted;
      if (status === "live" && dead) {
        void start();
      } else if (videoRef.current && videoRef.current.paused) {
        void videoRef.current.play().catch(() => {});
      }
    };

    const handlePageHide = () => stop();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [start, status, stop]);

  useEffect(() => stop, [stop]);

  return {
    videoRef,
    attachVideo,
    status,
    everLive,
    errorKind,
    facing,
    torchAvailable,
    torchOn,
    start,
    stop,
    flip,
    toggleTorch,
    pulseTorch,
  };
}
