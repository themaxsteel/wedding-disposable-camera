"use client";
import { useEffect, useState } from "react";
import { getUploader } from "@/lib/upload/uploader";

/** Di layar penutup, tamu perlu tahu kalau masih ada foto yang sedang dikirim. */
export default function PendingBadge() {
  const [pending, setPending] = useState(0);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const uploader = getUploader();
    uploader.bind();
    void uploader.refreshCount();
    return uploader.subscribe((state) => {
      setPending(state.pending);
      setOffline(state.offline);
    });
  }, []);

  if (pending === 0) {
    return (
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-teal">
        Semua foto terkirim
      </p>
    );
  }

  if (offline) {
    return (
      <p className="font-mono text-[11px] uppercase leading-relaxed tracking-[0.2em] text-film">
        Sinyal hilang — {pending} foto aman tersimpan di HP dan akan terkirim otomatis.
        Biarkan halaman ini terbuka.
      </p>
    );
  }

  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-film">
      Mengirim {pending} foto… jangan tutup halaman ini dulu
    </p>
  );
}
