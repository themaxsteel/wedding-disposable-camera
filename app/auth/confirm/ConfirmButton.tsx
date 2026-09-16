"use client";
import { useFormStatus } from "react-dom";

export default function ConfirmButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-film px-4 py-3.5 text-base font-semibold text-shell transition active:scale-[0.99] disabled:opacity-60"
    >
      {pending ? "Masuk…" : "Masuk ke galeri"}
    </button>
  );
}
