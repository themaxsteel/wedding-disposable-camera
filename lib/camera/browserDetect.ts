/** Browser dalam aplikasi (Instagram, FB, WhatsApp, Line, TikTok) sering memblokir getUserMedia. */
export function isInAppBrowser(ua: string = navigator.userAgent): boolean {
  return /(FBAN|FBAV|Instagram|Line\/|MicroMessenger|TikTok|Twitter|Snapchat|WhatsApp|GSA\/)/i.test(
    ua,
  );
}

export function isIOS(ua: string = navigator.userAgent): boolean {
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ menyamar sebagai Mac
    (/Macintosh/.test(ua) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1)
  );
}

export function isAndroid(ua: string = navigator.userAgent): boolean {
  return /Android/i.test(ua);
}

/** getUserMedia hanya hidup di secure context (https atau localhost). */
export function isSecureContextOk(): boolean {
  if (typeof window === "undefined") return false;
  return window.isSecureContext === true;
}

export function hasGetUserMedia(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

/** Instruksi khusus per platform saat izin kamera ditolak permanen. */
export function permissionHelpText(): string {
  if (isIOS()) {
    return "Buka Pengaturan → Safari → Kamera → Izinkan, lalu muat ulang halaman ini. Atau ketuk ikon «aA» di kiri atas bar alamat → Pengaturan Situs → Kamera → Izinkan.";
  }
  if (isAndroid()) {
    return "Ketuk ikon gembok di bar alamat → Izin → Kamera → Izinkan, lalu muat ulang halaman ini.";
  }
  return "Izinkan akses kamera lewat ikon gembok di bar alamat browser, lalu muat ulang halaman.";
}
