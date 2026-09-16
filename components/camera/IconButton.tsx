"use client";
import { m } from "motion/react";

interface Props {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}

export default function IconButton({ label, active, disabled, onPress, children }: Props) {
  return (
    <m.button
      type="button"
      onClick={onPress}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      whileTap={{ scale: 0.88 }}
      transition={{ type: "spring", stiffness: 600, damping: 28 }}
      className={`flex size-13 items-center justify-center rounded-full border transition-colors duration-200 disabled:opacity-35 [&_svg]:size-6 ${
        active
          ? "border-film/70 bg-film/20 text-film"
          : "border-cream/12 bg-shell-3 text-cream/80"
      }`}
    >
      {children}
    </m.button>
  );
}
