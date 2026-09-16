/**
 * Bodi plastik kamera sekali pakai: jendela bidik di kiri atas, jendela
 * angka film di kanan atas, lalu isi (form) di "panel belakang" kamera.
 */
export default function CameraBody({
  exposures,
  children,
}: {
  exposures: number;
  children: React.ReactNode;
}) {
  return (
    <div className="body-plastic w-full rounded-[28px] border border-line p-2">
      <div className="flex items-center justify-between px-3 pt-2 pb-3">
        <div className="flex items-center gap-3">
          {/* Jendela bidik optik */}
          <span
            aria-hidden
            className="h-7 w-11 rounded-md border border-cream/15 bg-[radial-gradient(circle_at_35%_30%,#3a332d_0%,#0b0908_70%)] shadow-[inset_0_2px_6px_rgb(0_0_0/0.8)]"
          />
          <span aria-hidden className="size-2.5 rounded-full bg-film/80 shadow-[0_0_0_3px_rgb(227_154_80/0.15)]" />
        </div>
        <span className="rounded-md border border-cream/10 bg-shell px-2 py-1 font-mono text-xs tabular-nums text-cream/80">
          {exposures} <span className="text-cream/45">EXP</span>
        </span>
      </div>
      <div className="rounded-[20px] border border-line bg-shell/85 p-5">{children}</div>
    </div>
  );
}
