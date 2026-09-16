"use client";
import { useEffect, useEffectEvent, useId, useRef } from "react";
import { AnimatePresence, m } from "motion/react";
import Button from "@/components/ui/Button";

interface Props {
  open: boolean;
  title: string;
  children?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Konfirmasi singkat untuk aksi yang tidak bisa diurungkan diam-diam. */
export default function Dialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = "Batal",
  tone = "primary",
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Handler terbaru tanpa memasang ulang listener setiap render parent.
  const cancel = useEffectEvent(() => onCancel());

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        // Jangan sampai Escape ikut menutup lightbox di belakang dialog.
        event.stopPropagation();
        cancel();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      previous?.focus?.();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <m.div
          key="dialog"
          className="fixed inset-0 z-(--z-sheet) flex items-end justify-center bg-shell/80 p-4 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onCancel}
        >
          <m.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-sm rounded-2xl border border-line-strong bg-shell-2 p-6 shadow-[0_30px_80px_-20px_rgb(6_4_3/0.9)]"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id={titleId} className="text-base font-semibold tracking-tight">
              {title}
            </h2>
            {children ? (
              <div className="mt-2 text-sm leading-relaxed text-cream/65">{children}</div>
            ) : null}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={busy}>
                {cancelLabel}
              </Button>
              <Button
                variant={tone === "danger" ? "danger" : "primary"}
                onClick={onConfirm}
                loading={busy}
              >
                {confirmLabel}
              </Button>
            </div>
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
