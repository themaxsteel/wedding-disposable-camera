import type { Metadata } from "next";
import { confirmAccess } from "./actions";
import ConfirmButton from "./ConfirmButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Masuk ke galeri",
  // Token ada di URL: jangan sampai terkirim ke situs lain lewat header Referer.
  referrer: "no-referrer",
};

/**
 * Halaman tujuan link undangan. Membukanya TIDAK memakai token — token baru
 * ditukar saat tombol ditekan (lihat actions.ts), supaya preview link di
 * WhatsApp tidak menghanguskannya.
 */
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
  const { token_hash: tokenHash, type, next } = await searchParams;
  const valid = Boolean(tokenHash && type);

  return (
    <main className="flex min-h-dvh items-center justify-center p-6 shell-texture">
      <div className="w-full max-w-sm rounded-2xl border border-cream/10 bg-shell-2/80 p-6 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-film/80">
          Kamera sekali pakai
        </p>

        {valid ? (
          <>
            <h1 className="mt-3 text-xl font-semibold">Kamu diundang ke galeri foto</h1>
            <p className="mt-2 mb-6 text-sm leading-relaxed text-cream/60">
              Tekan tombol di bawah untuk masuk dan melihat foto-foto dari para tamu.
            </p>
            <form action={confirmAccess}>
              <input type="hidden" name="token_hash" value={tokenHash} />
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="next" value={next ?? "/admin"} />
              <ConfirmButton />
            </form>
          </>
        ) : (
          <>
            <h1 className="mt-3 text-xl font-semibold">Link tidak lengkap</h1>
            <p className="mt-2 text-sm text-cream/60">
              Pastikan link disalin utuh, atau minta link baru ke admin.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
