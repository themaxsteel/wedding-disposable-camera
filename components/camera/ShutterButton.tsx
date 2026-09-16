interface Props {
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}

export default function ShutterButton({ onPress, disabled, busy }: Props) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      aria-label="Ambil foto"
      className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-cream/80 bg-cream/10 transition active:scale-95 disabled:opacity-40"
    >
      <span
        className={`h-14 w-14 rounded-full transition ${
          busy ? "scale-90 bg-film/70" : "bg-film"
        }`}
      />
    </button>
  );
}
