"use client";
import { useState } from "react";
import { m } from "motion/react";
import { ChatCircleTextIcon } from "@phosphor-icons/react/ssr";
import { CAPTION_GRACE_MS } from "@/lib/upload/queue";

interface Props {
  /** Dipanggil saat tamu mengirim caption atau melewatinya. */
  onClose: (caption: string | null) => void;
}

/**
 * Muncul sesaat setelah jepretan. Sengaja tidak menampilkan fotonya:
 * tamu tetap tidak boleh melihat hasil sampai "filmnya dicuci".
 * Dipasang di dalam AnimatePresence oleh parent supaya bisa meluncur keluar.
 */
export default function CaptionSheet({ onClose }: Props) {
  // Parent memberi key per foto, jadi komponen ini selalu lahir kosong,
  // tidak perlu effect untuk mereset. Sengaja tanpa autofocus: keyboard yang
  // muncul tiba-tiba menutupi tombol shutter.
  const [value, setValue] = useState("");

  return (
    <m.div
      className="fixed inset-x-0 bottom-0 z-(--z-sheet) px-3 safe-bottom"
      initial={{ y: "110%" }}
      animate={{ y: 0 }}
      exit={{ y: "110%" }}
      transition={{ type: "spring", stiffness: 420, damping: 38 }}
    >
      <div className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-line-strong bg-shell-2/95 shadow-[0_-20px_60px_-20px_rgb(0_0_0/0.9)] backdrop-blur-md">
        {/* Waktu tersisa sebelum foto dikirim tanpa pesan */}
        <div className="h-0.5 bg-cream/5">
          <div
            aria-hidden
            className="h-full origin-left bg-film/70 motion-safe:animate-[deplete_linear_forwards]"
            style={{ animationDuration: `${CAPTION_GRACE_MS}ms` }}
          />
        </div>

        <div className="p-4">
          <label
            htmlFor="caption"
            className="mb-2.5 flex items-center gap-2 text-sm font-medium text-cream/85"
          >
            <ChatCircleTextIcon className="size-4 text-film" weight="fill" aria-hidden />
            Titip pesan untuk pengantin?
          </label>
          <div className="flex gap-2">
            <input
              id="caption"
              type="text"
              maxLength={200}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onClose(value.trim() || null);
              }}
              placeholder="Boleh dilewati"
              enterKeyHint="done"
              className="h-12 min-w-0 flex-1 rounded-xl border border-line-strong bg-shell px-3.5 text-base text-cream outline-none transition placeholder:text-cream/40 focus:border-film/70"
            />
            <button
              type="button"
              onClick={() => onClose(value.trim() || null)}
              className="h-12 rounded-xl bg-film px-4 text-sm font-semibold text-shell transition active:scale-[0.97]"
            >
              Simpan
            </button>
          </div>
          <button
            type="button"
            onClick={() => onClose(null)}
            className="mt-1 h-10 w-full rounded-xl text-center text-sm text-cream/55 transition active:bg-cream/5"
          >
            Lewati
          </button>
        </div>
      </div>
    </m.div>
  );
}
