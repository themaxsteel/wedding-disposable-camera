"use client";
import { useEffect, useState } from "react";
import { getUploader } from "@/lib/upload/uploader";

/** Di layar penutup, tamu perlu tahu kalau masih ada foto yang sedang dikirim. */
export default function PendingBadge() {
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const uploader = getUploader();
    uploader.bind();
    void uploader.refreshCount();
    return uploader.subscribe((state) => setPending(state.pending));
  }, []);

  if (pending === 0) {
    return (
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-teal">
        Semua foto terkirim
      </p>
    );
  }

  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-film">
      Mengirim {pending} foto… jangan tutup halaman ini dulu
    </p>
  );
}
