"use client";
import { AnimatePresence, m } from "motion/react";
import { CloudArrowUpIcon, WifiSlashIcon } from "@phosphor-icons/react/ssr";

interface Props {
  remaining: number;
  limit: number;
  pending: number;
  /** Server tidak terjangkau: foto aman di HP dan dikirim ulang otomatis. */
  offline: boolean;
}

/**
 * Jendela angka film seperti di bodi kamera sekali pakai. Angkanya
 * menggulung ke atas setiap jepretan, seperti roda film yang maju.
 */
export default function FilmCounter({ remaining, limit, pending, offline }: Props) {
  const value = String(Math.max(0, remaining)).padStart(2, "0");
  const low = remaining > 0 && remaining <= Math.max(3, Math.ceil(limit * 0.1));

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-baseline gap-1 rounded-lg border border-cream/12 bg-shell px-2.5 py-1.5 shadow-[inset_0_2px_6px_rgb(0_0_0/0.7)]"
        aria-label={`Sisa film ${remaining} dari ${limit}`}
        role="status"
      >
        <span className="relative inline-flex h-6 overflow-hidden font-mono text-2xl leading-6 font-medium tabular-nums">
          <AnimatePresence mode="popLayout" initial={false}>
            <m.span
              key={value}
              className={low ? "text-danger" : "text-film"}
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "-100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            >
              {value}
            </m.span>
          </AnimatePresence>
        </span>
        <span className="font-mono text-[11px] text-cream/45">/{limit}</span>
      </div>

      <AnimatePresence initial={false}>
        {pending > 0 ? (
          <m.span
            key={offline ? "offline" : "pending"}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-xs ${
              offline ? "bg-film/15 text-film" : "text-cream/60"
            }`}
          >
            {offline ? (
              <WifiSlashIcon className="size-3.5" weight="bold" aria-hidden />
            ) : (
              <CloudArrowUpIcon className="size-3.5" weight="bold" aria-hidden />
            )}
            {offline ? `${pending} aman di HP` : `${pending} dikirim`}
          </m.span>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
