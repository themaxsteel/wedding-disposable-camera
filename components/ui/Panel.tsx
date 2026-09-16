import {
  CheckCircleIcon,
  InfoIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

/** Permukaan terangkat. Dipakai hanya bila isinya memang satu kelompok. */
export function Panel({
  className = "",
  tone = "default",
  ...rest
}: React.ComponentProps<"div"> & { tone?: "default" | "danger" }) {
  const toneClass =
    tone === "danger"
      ? "border-danger/25 bg-danger/[0.04]"
      : "border-line bg-shell-2/80";
  return (
    <div
      className={`rounded-2xl border p-5 shadow-[0_1px_0_0_rgb(242_232_217/0.04)_inset] sm:p-6 ${toneClass} ${className}`}
      {...rest}
    />
  );
}

/** Label kecil mono kapital. Dipakai hemat: satu per layar. */
export function Eyebrow({ className = "", ...rest }: React.ComponentProps<"p">) {
  return (
    <p
      className={`font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-film ${className}`}
      {...rest}
    />
  );
}

const NOTICE_TONE = {
  ok: { box: "border-ok/30 bg-ok/[0.07]", icon: "text-ok", Icon: CheckCircleIcon },
  warn: { box: "border-film/35 bg-film/[0.07]", icon: "text-film", Icon: WarningCircleIcon },
  danger: { box: "border-danger/35 bg-danger/[0.07]", icon: "text-danger", Icon: WarningCircleIcon },
  info: { box: "border-line-strong bg-cream/[0.03]", icon: "text-cream/60", Icon: InfoIcon },
} as const;

/** Pesan status sebaris: berhasil, peringatan, gagal, atau info. */
export function Notice({
  tone = "info",
  title,
  children,
  action,
  className = "",
  role,
}: {
  tone?: keyof typeof NOTICE_TONE;
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  role?: "status" | "alert";
}) {
  const { box, icon, Icon } = NOTICE_TONE[tone];
  return (
    <div
      role={role ?? (tone === "danger" ? "alert" : "status")}
      className={`flex gap-3 rounded-xl border p-4 text-left text-sm ${box} ${className}`}
    >
      <Icon className={`mt-0.5 size-5 shrink-0 ${icon}`} weight="fill" aria-hidden />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-medium text-cream">{title}</p> : null}
        {children ? (
          <div className={`leading-relaxed text-cream/70 ${title ? "mt-1" : ""}`}>{children}</div>
        ) : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}
