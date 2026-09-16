"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { CheckCircleIcon, CloudArrowUpIcon, WifiSlashIcon } from "@phosphor-icons/react/ssr";
import { getUploader } from "@/lib/upload/uploader";

/** Di layar penutup, tamu perlu tahu kalau masih ada foto yang sedang dikirim. */
export default function PendingBadge() {
  const [pending, setPending] = useState<number | null>(null);
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

  const view =
    pending === null
      ? null
      : pending === 0
        ? {
            key: "done",
            tone: "border-ok/30 bg-ok/[0.07] text-ok",
            icon: <CheckCircleIcon className="size-5" weight="fill" aria-hidden />,
            title: "Semua foto sudah terkirim",
            body: "Halaman ini boleh ditutup.",
          }
        : offline
          ? {
              key: "offline",
              tone: "border-film/35 bg-film/[0.07] text-film",
              icon: <WifiSlashIcon className="size-5" weight="bold" aria-hidden />,
              title: `Sinyal hilang, ${pending} foto aman di HP`,
              body: "Foto terkirim otomatis begitu sinyal kembali. Biarkan halaman ini terbuka.",
            }
          : {
              key: "sending",
              tone: "border-line-strong bg-cream/[0.03] text-film",
              icon: <CloudArrowUpIcon className="size-5 animate-pulse" weight="bold" aria-hidden />,
              title: `Mengirim ${pending} foto`,
              body: "Jangan tutup halaman ini dulu.",
            };

  return (
    <div role="status" aria-live="polite" className="min-h-[76px]">
      <AnimatePresence mode="wait">
        {view ? (
          <m.div
            key={view.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className={`flex gap-3 rounded-xl border p-4 text-left ${view.tone}`}
          >
            <span className="mt-0.5 shrink-0">{view.icon}</span>
            <div>
              <p className="text-sm font-medium text-cream">{view.title}</p>
              <p className="mt-0.5 text-sm text-cream/60">{view.body}</p>
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
