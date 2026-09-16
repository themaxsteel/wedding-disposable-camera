"use client";
import { useRef, useState } from "react";

interface Props {
  open: boolean;
  /** Dipanggil saat tamu mengirim caption atau melewatinya. */
  onClose: (caption: string | null) => void;
}

/**
 * Muncul sesaat setelah jepretan. Sengaja tidak menampilkan fotonya —
 * tamu tetap tidak boleh melihat hasil sampai "filmnya dicuci".
 */
export default function CaptionSheet({ open, onClose }: Props) {
  // Parent memberi key per foto, jadi komponen ini selalu lahir kosong —
  // tidak perlu effect untuk mereset. Sengaja tanpa autofocus: keyboard yang
  // muncul tiba-tiba menutupi tombol shutter.
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-cream/10 bg-shell-2/95 p-4 backdrop-blur safe-bottom">
      <div className="mx-auto w-full max-w-sm">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-cream/40">
          Titip pesan untuk pengantin?
        </p>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            maxLength={200}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onClose(value.trim() || null);
            }}
            placeholder="Opsional — boleh dilewati"
            enterKeyHint="done"
            className="min-w-0 flex-1 rounded-lg border border-cream/15 bg-black/40 px-3 py-3 text-sm text-cream outline-none placeholder:text-cream/25 focus:border-film/60"
          />
          <button
            type="button"
            onClick={() => onClose(value.trim() || null)}
            className="rounded-lg bg-film px-4 py-3 text-sm font-semibold text-shell"
          >
            Simpan
          </button>
        </div>
        <button
          type="button"
          onClick={() => onClose(null)}
          className="mt-2 w-full py-2 text-center text-xs text-cream/40"
        >
          Lewati
        </button>
      </div>
    </div>
  );
}
