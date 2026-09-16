import Link from "next/link";
import { CircleNotchIcon } from "@phosphor-icons/react/ssr";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const BASE =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition duration-200 ease-out active:translate-y-px active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-film text-shell shadow-(--shadow-press) hover:bg-film-hi font-semibold",
  secondary:
    "border border-line-strong bg-cream/[0.03] text-cream/85 hover:border-film/50 hover:bg-cream/[0.06] hover:text-cream",
  ghost: "text-cream/60 hover:bg-cream/[0.05] hover:text-cream",
  danger: "bg-danger text-shell font-semibold hover:brightness-110",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-xs",
  md: "h-11 px-4 text-sm",
  lg: "h-14 px-5 text-base",
};

export function buttonClass({
  variant = "primary",
  size = "md",
  block = false,
  className = "",
}: {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  className?: string;
} = {}): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${block ? "w-full" : ""} ${className}`;
}

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
};

export default function Button({
  variant,
  size,
  block,
  loading = false,
  icon,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass({ variant, size, block, className })}
      {...rest}
    >
      {loading ? (
        <CircleNotchIcon className="size-[1.15em] animate-spin" weight="bold" aria-hidden />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}

type LinkButtonProps = React.ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  icon?: React.ReactNode;
};

export function LinkButton({
  variant,
  size,
  block,
  icon,
  className,
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <Link className={buttonClass({ variant, size, block, className })} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
