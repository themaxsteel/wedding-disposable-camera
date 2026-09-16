import { FilmStripIcon } from "@phosphor-icons/react/ssr";

/** Kartu tengah untuk halaman login dan undangan. */
export default function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="shell-texture flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="reveal w-full max-w-sm">
        <div className="body-plastic rounded-[28px] border border-line p-2">
          <div className="flex items-center gap-2 px-3 pt-2 pb-3">
            <span className="flex size-7 items-center justify-center rounded-lg bg-film text-shell">
              <FilmStripIcon className="size-4" weight="bold" aria-hidden />
            </span>
            <span className="text-sm font-semibold tracking-tight">Ruang cuci film</span>
          </div>
          <div className="rounded-[20px] border border-line bg-shell/85 p-6">
            <h1 className="text-2xl leading-tight font-semibold tracking-tight">{title}</h1>
            {description ? (
              <p className="mt-2 text-sm leading-relaxed text-cream/60">{description}</p>
            ) : null}
            <div className="mt-6">{children}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
