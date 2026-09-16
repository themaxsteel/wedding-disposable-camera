import type { Facing } from "@/lib/types";

/**
 * Daftar constraint bertingkat. Kamera HP kelas bawah sering menolak
 * permintaan resolusi tertentu dengan OverconstrainedError, jadi kita
 * turun level satu per satu sampai ada yang diterima.
 */
export function constraintLadder(facing: Facing): MediaStreamConstraints[] {
  return [
    {
      audio: false,
      video: {
        facingMode: { ideal: facing },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    },
    {
      audio: false,
      video: { facingMode: { ideal: facing } },
    },
    {
      audio: false,
      video: true,
    },
  ];
}

export type CameraErrorKind =
  | "ditolak"
  | "tidak_ada_kamera"
  | "dipakai_app_lain"
  | "tidak_aman"
  | "tidak_didukung"
  | "lainnya";

export function classifyCameraError(error: unknown): CameraErrorKind {
  const name =
    typeof error === "object" && error && "name" in error
      ? String((error as { name: unknown }).name)
      : "";

  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "ditolak";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "tidak_ada_kamera";
    case "NotReadableError":
    case "TrackStartError":
      return "dipakai_app_lain";
    case "SecurityError":
      return "tidak_aman";
    case "TypeError":
      return "tidak_didukung";
    default:
      return "lainnya";
  }
}

export function cameraErrorMessage(kind: CameraErrorKind): string {
  switch (kind) {
    case "ditolak":
      return "Akses kamera ditolak.";
    case "tidak_ada_kamera":
      return "Kamera tidak terdeteksi di perangkat ini.";
    case "dipakai_app_lain":
      return "Kamera sedang dipakai aplikasi lain. Tutup aplikasi kamera/video call lalu coba lagi.";
    case "tidak_aman":
      return "Halaman ini harus dibuka lewat HTTPS agar kamera bisa aktif.";
    case "tidak_didukung":
      return "Browser ini tidak mendukung kamera web.";
    default:
      return "Kamera gagal dinyalakan.";
  }
}
