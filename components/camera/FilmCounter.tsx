interface Props {
  remaining: number;
  limit: number;
  pending: number;
}

/** Jendela counter kecil seperti di bodi kamera film. */
export default function FilmCounter({ remaining, limit, pending }: Props) {
  const used = Math.max(0, limit - remaining);
  const progress = limit > 0 ? used / limit : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="rounded-md border border-cream/15 bg-black/50 px-2.5 py-1">
        <span className="font-mono text-lg leading-none text-film tabular-nums">
          {String(Math.max(0, remaining)).padStart(2, "0")}
        </span>
        <span className="ml-1 font-mono text-[10px] text-cream/40">/{limit}</span>
      </div>

      <div className="hidden h-1 w-16 overflow-hidden rounded-full bg-cream/10 sm:block">
        <div
          className="h-full bg-film/70 transition-[width] duration-500"
          style={{ width: `${Math.min(100, progress * 100)}%` }}
        />
      </div>

      {pending > 0 ? (
        <span className="font-mono text-[10px] uppercase tracking-wider text-cream/40">
          {pending} menunggu
        </span>
      ) : null}
    </div>
  );
}
