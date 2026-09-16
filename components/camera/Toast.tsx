"use client";
import { useEffect } from "react";

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

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-36 z-40 flex justify-center px-6"
    >
      <div
        className={`toast-in rounded-full px-4 py-2 text-sm font-medium shadow-lg backdrop-blur ${
          tone === "ok" ? "bg-cream/95 text-shell" : "bg-film/95 text-shell"
        }`}
      >
        {message}
      </div>
    </div>
  );
}
