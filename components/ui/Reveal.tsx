/**
 * Masuk bertahap untuk bagian halaman. Sengaja CSS murni, bukan motion:
 * konten dari server harus tetap terlihat walau JavaScript lambat dimuat
 * (sinyal gedung resepsi sering buruk). Urutan (`index`) menunjukkan
 * hierarki: judul dulu, lalu aksi, lalu penjelasan.
 */
export default function Reveal({
  index = 0,
  className = "",
  children,
}: {
  index?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`reveal ${className}`} style={{ animationDelay: `${60 + index * 80}ms` }}>
      {children}
    </div>
  );
}
