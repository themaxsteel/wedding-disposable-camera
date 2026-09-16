"use client";
import { m } from "motion/react";

interface Props {
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  /** Berubah setiap jepretan; memicu animasi "mengisi ulang". */
  shotKey?: number;
}

/** Tombol rana fisik: cincin logam, tombol oranye yang terasa ditekan. */
export default function ShutterButton({ onPress, disabled, busy, shotKey = 0 }: Props) {
  return (
    <m.button
      type="button"
      onClick={onPress}
      disabled={disabled}
      aria-label="Ambil foto"
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 600, damping: 26 }}
      className="relative flex size-21 items-center justify-center rounded-full bg-[linear-gradient(180deg,#3a342f_0%,#1b1816_100%)] p-1.5 shadow-[0_10px_24px_-8px_rgb(0_0_0/0.9),inset_0_1px_0_rgb(242_232_217/0.15)] disabled:opacity-50"
    >
      <span className="flex size-full items-center justify-center rounded-full border-[3px] border-cream/85">
        <m.span
          className="block size-[calc(100%-10px)] rounded-full bg-[radial-gradient(circle_at_40%_30%,#f2b475_0%,var(--color-film)_55%,#b8732f_100%)] shadow-[inset_0_-3px_6px_rgb(0_0_0/0.25)]"
          animate={{ scale: busy ? 0.84 : 1, opacity: busy ? 0.75 : 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </span>
      {shotKey > 0 ? (
        <span
          key={shotKey}
          aria-hidden
          className="animate-recharge pointer-events-none absolute -inset-1.5 rounded-full border-2 border-film/70"
        />
      ) : null}
    </m.button>
  );
}
