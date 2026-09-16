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
import { m } from "motion/react";
import {
  ApertureIcon,
  ArrowClockwiseIcon,
  CameraIcon,
  CheckIcon,
  CopyIcon,
  ImageSquareIcon,
} from "@phosphor-icons/react/ssr";
import Button from "@/components/ui/Button";
import { Notice } from "@/components/ui/Panel";

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
 * Tamu tidak boleh sampai buntu: input galeri selalu tersedia.
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

  const starting = status === "starting";

  return (
    <main className="shell-texture flex min-h-dvh flex-col px-5 pt-8 pb-8 safe-top safe-bottom">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col">
        <p className="text-sm text-cream/55">{coupleNames}</p>

        <div className="flex flex-1 flex-col justify-center gap-7 py-8">
          {/* Lensa: berdenyut pelan saat kamera sedang dinyalakan */}
          <m.div
            aria-hidden
            className="body-plastic flex size-28 items-center justify-center rounded-full border border-line"
            animate={starting ? { scale: [1, 0.96, 1] } : { scale: 1 }}
            transition={starting ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : undefined}
          >
            <span className="flex size-20 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#3d3530_0%,#0b0908_72%)] shadow-[inset_0_3px_10px_rgb(0_0_0/0.8)] ring-1 ring-cream/10">
              <ApertureIcon className="size-9 text-film/85" weight="light" />
            </span>
          </m.div>

          <div className="space-y-2">
            <h1 className="text-3xl leading-tight font-semibold tracking-tight">
              {status === "error" ? "Kamera belum bisa dibuka" : "Siap memotret?"}
            </h1>
            {status !== "error" ? (
              <p className="max-w-[36ch] text-[15px] leading-relaxed text-cream/65">
                Browser akan meminta izin kamera. Pilih{" "}
                <span className="font-medium text-cream">Izinkan</span>, lalu jepret
                sesukamu sampai filmnya habis.
              </p>
            ) : null}
          </div>

          {inApp ? (
            <Notice
              tone="warn"
              title="Buka di Safari atau Chrome"
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={copyLink}
                  icon={
                    copied ? (
                      <CheckIcon className="size-4 text-ok" weight="bold" aria-hidden />
                    ) : (
                      <CopyIcon className="size-4" aria-hidden />
                    )
                  }
                >
                  {copied ? "Link tersalin" : "Salin link"}
                </Button>
              }
            >
              Browser di dalam aplikasi seperti Instagram atau WhatsApp sering memblokir
              kamera. Ketuk menu di pojok, lalu pilih Buka di browser.
            </Notice>
          ) : null}

          {status === "error" && errorKind ? (
            <Notice tone="danger" title={cameraErrorMessage(errorKind)}>
              {errorKind === "ditolak" ? permissionHelpText() : null}
            </Notice>
          ) : null}
        </div>

        <div className="space-y-3">
          <Button
            size="lg"
            block
            onClick={onStart}
            loading={starting}
            icon={
              status === "error" ? (
                <ArrowClockwiseIcon className="size-5" weight="bold" aria-hidden />
              ) : (
                <CameraIcon className="size-5" weight="bold" aria-hidden />
              )
            }
          >
            {starting ? "Menyalakan kamera" : status === "error" ? "Coba lagi" : "Buka kamera"}
          </Button>

          <Button
            variant="ghost"
            block
            onClick={() => fileRef.current?.click()}
            icon={<ImageSquareIcon className="size-4" aria-hidden />}
          >
            Kamera bermasalah? Kirim dari galeri
          </Button>
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
