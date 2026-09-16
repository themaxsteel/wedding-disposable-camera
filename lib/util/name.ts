/** Kunci grouping nama tamu di dashboard: "  Budi  Santoso " → "budi santoso". */
export function toNameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Rapikan nama untuk ditampilkan, batasi panjang. */
export function cleanDisplayName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, 40);
}

/** Nama folder aman untuk di dalam file ZIP. */
export function toFolderName(name: string): string {
  const safe = name
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N} _.-]/gu, "")
    .trim()
    .replace(/\s+/g, "_");
  return safe.length > 0 ? safe.slice(0, 60) : "Tanpa_Nama";
}
