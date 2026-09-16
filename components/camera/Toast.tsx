"use client";
import { useEffect } from "react";
import { AnimatePresence, m } from "motion/react";
import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react/ssr";

interface Props {
  message: string | null;
  tone?: "ok" | "warn";
  onDone: () => void;
}

export default function Toast({ message, tone = "ok", onDone }: Props) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDone, 2200);
    return () => clearTimeout(timer);
  }, [message, onDone]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-20 z-(--z-toast) flex justify-center px-6"
    >
      <AnimatePresence>
        {message ? (
          <m.div
            key={message}
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
            className={`flex items-center gap-2 rounded-full py-2 pr-4 pl-3 text-sm font-medium shadow-[0_12px_30px_-10px_rgb(0_0_0/0.8)] ${
              tone === "ok" ? "bg-cream text-shell" : "bg-film text-shell"
            }`}
          >
            {tone === "ok" ? (
              <CheckCircleIcon className="size-4.5" weight="fill" aria-hidden />
            ) : (
              <WarningCircleIcon className="size-4.5" weight="fill" aria-hidden />
            )}
            {message}
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
