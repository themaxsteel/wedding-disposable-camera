/** Rol film yang tergulung habis: satu putaran melambat lalu berhenti (CSS murni). */
export default function RollWind({ children }: { children: React.ReactNode }) {
  return (
    <div className="reveal body-plastic flex size-24 items-center justify-center rounded-3xl border border-line">
      <span className="roll-wind flex">{children}</span>
    </div>
  );
}
