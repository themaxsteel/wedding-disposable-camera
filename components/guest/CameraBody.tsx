/** Bodi plastik kamera sekali pakai — bingkai untuk konten di layar awal. */
export default function CameraBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-sm rounded-[28px] border border-cream/10 bg-shell-2/80 p-6 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)]">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-3 w-12 rounded-full bg-film/80" />
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-teal" />
          <span className="h-2 w-2 rounded-full bg-cream/20" />
          <span className="h-2 w-2 rounded-full bg-cream/20" />
        </div>
      </div>
      {children}
    </div>
  );
}
