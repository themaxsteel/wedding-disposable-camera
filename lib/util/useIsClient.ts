"use client";
import { useSyncExternalStore } from "react";

const subscribeNever = () => () => {};

/**
 * false saat render server & hidrasi, true setelahnya. Dipakai untuk nilai yang
 * bergantung pada browser (zona waktu, window.location) tanpa mismatch hidrasi.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}
