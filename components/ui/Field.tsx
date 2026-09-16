/** Kontrol form bersama. Label selalu di atas input, bantuan dan error di bawah. */

const CONTROL =
  "w-full rounded-xl border border-line-strong px-3.5 text-cream outline-none transition duration-200 placeholder:text-cream/40 hover:border-cream/25 focus:border-film/70 focus:bg-shell focus-visible:outline-none focus:ring-3 focus:ring-film/15 disabled:opacity-50 aria-invalid:border-danger/70";

/** Untuk kontrol tak standar; tambahkan sendiri tinggi, latar, dan ukuran teks. */
export const controlClass = CONTROL;

export function Label({
  className = "",
  ...rest
}: React.ComponentProps<"label">) {
  return (
    <label
      className={`mb-2 block text-[13px] font-medium text-cream/75 ${className}`}
      {...rest}
    />
  );
}

export function Input({
  className = "",
  large = false,
  ...rest
}: React.ComponentProps<"input"> & { large?: boolean }) {
  const size = large ? "h-13 text-base" : "h-11 text-sm";
  return <input className={`${CONTROL} bg-shell/70 ${size} ${className}`} {...rest} />;
}

export function Textarea({ className = "", ...rest }: React.ComponentProps<"textarea">) {
  return <textarea className={`${CONTROL} bg-shell/70 py-3 text-sm leading-relaxed ${className}`} {...rest} />;
}

export function Select({ className = "", ...rest }: React.ComponentProps<"select">) {
  return <select className={`${CONTROL} h-11 bg-shell-2 pr-8 text-sm ${className}`} {...rest} />;
}

export function Hint({ className = "", ...rest }: React.ComponentProps<"p">) {
  return <p className={`mt-2 text-xs leading-relaxed text-cream/50 ${className}`} {...rest} />;
}

export function FieldError({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-2 text-sm text-danger">
      {children}
    </p>
  );
}
