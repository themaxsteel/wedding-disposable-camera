"use client";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";

/**
 * Hanya fitur animasi dasar yang dimuat (tanpa drag/layout) supaya bundle
 * layar kamera tetap ringan. `strict` memaksa pemakaian komponen `m.*`.
 * Animasi otomatis mati untuk pengguna yang memilih kurangi gerakan.
 */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
