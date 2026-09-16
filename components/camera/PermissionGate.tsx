"use client";
import { useRef, useState, useSyncExternalStore } from "react";
import {
  cameraErrorMessage,
  type CameraErrorKind,
} from "@/lib/camera/constraints";
import {
  isInAppBrowser,
  permissionHelpText,
} from "@/lib/camera/browserDetect";
import type { StreamStatus } from "@/lib/camera/useCameraStream";

const subscribeNever = () => () => {};

interface Props {
  status: StreamStatus;
  errorKind: CameraErrorKind | null;
  coupleNames: string;
  onStart: () => void;
  onPickFile: (file: File) => void;
}

/**
 * Semua kondisi sebelum viewfinder hidup: izin, error, dan jalur cadangan.
 * Tamu tidak boleh sampai buntu — input galeri selalu tersedia.
 */
export default function PermissionGate({
  status,
  errorKind,
  coupleNames,
  onStart,
  onPickFile,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  // Nilai ini hanya ada di browser. useSyncExternalStore memberi snapshot
  // server (false) dan client secara sah, tanpa efek atau mismatch hidrasi.
  const inApp = useSyncExternalStore(
    subscribeNever,
    () => isInAppBrowser(),
    () => false,
  );

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 shell-texture safe-top safe-bottom">
      <div className="w-full max-w-sm space-y-5 text-center">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-film/80">
            Kamera sekali pakai
          </p>
          <h1 className="mt-2 text-xl font-semibold">{coupleNames}</h1>
        </div>

        {inApp ? (
          <div className="rounded-xl border border-film/40 bg-film/10 p-4 text-left text-sm">
            <p className="font-medium text-film">Buka di Safari / Chrome</p>
            <p className="mt-1 text-cream/60">
              Browser di dalam aplikasi (Instagram, WhatsApp, dsb.) sering memblokir
              kamera. Ketuk menu «…» lalu pilih &ldquo;Buka di browser&rdquo;.
            </p>
            <button
              type="button"
              onClick={copyLink}
              className="mt-3 rounded-lg border border-film/50 px-3 py-2 text-xs font-medium text-film"
            >
              {copied ? "Link tersalin ✓" : "Salin link"}
            </button>
          </div>
        ) : null}

        {status === "error" && errorKind ? (
          <div className="rounded-xl border border-cream/15 bg-black/30 p-4 text-left text-sm">
            <p className="font-medium text-film">{cameraErrorMessage(errorKind)}</p>
            {errorKind === "ditolak" ? (
              <p className="mt-2 leading-relaxed text-cream/60">
                {permissionHelpText()}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-cream/60">
            Sebentar lagi browser minta izin kamera — pilih{" "}
            <span className="text-cream">Izinkan</span>. Foto langsung terkirim ke
            pengantin dan tidak bisa kamu lihat lagi setelahnya.
          </p>
        )}

        <button
          type="button"
          onClick={onStart}
          disabled={status === "starting"}
          className="w-full rounded-xl bg-film px-4 py-4 text-base font-semibold text-shell transition active:scale-[0.99] disabled:opacity-60"
        >
          {status === "starting"
            ? "Menyalakan kamera…"
            : status === "error"
              ? "Coba lagi"
              : "Buka kamera"}
        </button>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-xs text-cream/40 underline underline-offset-4"
          >
            Kamera bermasalah? Kirim dari galeri
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onPickFile(file);
              event.target.value = "";
            }}
          />
        </div>
      </div>
    </main>
  );
}
