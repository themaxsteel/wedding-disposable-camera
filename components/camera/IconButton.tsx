interface Props {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}

export default function IconButton({ label, active, disabled, onPress, children }: Props) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-12 w-12 items-center justify-center rounded-full border transition active:scale-95 disabled:opacity-30 ${
        active
          ? "border-film bg-film/20 text-film"
          : "border-cream/20 bg-black/40 text-cream/70"
      }`}
    >
      {children}
    </button>
  );
}
