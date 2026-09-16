/** Tampilan kosong, gagal, dan placeholder memuat. */

export function EmptyState({
  icon,
  title,
  children,
  action,
  className = "",
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-start gap-4 rounded-2xl border border-dashed border-line-strong px-6 py-10 sm:px-10 ${className}`}
    >
      {icon ? (
        <span className="flex size-12 items-center justify-center rounded-xl border border-line bg-shell-3 text-film [&_svg]:size-6">
          {icon}
        </span>
      ) : null}
      <div className="max-w-[46ch] space-y-1.5">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {children ? (
          <div className="text-sm leading-relaxed text-cream/60">{children}</div>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`relative overflow-hidden rounded-xl bg-shell-3/70 ${className}`}
    >
      <div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-cream/[0.05] to-transparent" />
    </div>
  );
}
