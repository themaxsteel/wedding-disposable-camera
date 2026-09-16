import type { Metadata } from "next";
import { confirmAccess } from "./actions";
import ConfirmButton from "./ConfirmButton";
import AuthCard from "@/components/admin/AuthCard";
import { LinkButton } from "@/components/ui/Button";

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

  return valid ? (
    <AuthCard
      title="Kamu diundang ke galeri foto"
      description="Tekan tombol di bawah untuk masuk dan melihat foto dari para tamu."
    >
      <form action={confirmAccess}>
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="next" value={next ?? "/admin"} />
        <ConfirmButton />
      </form>
    </AuthCard>
  ) : (
    <AuthCard
      title="Link tidak lengkap"
      description="Pastikan link disalin utuh, atau minta link baru ke admin."
    >
      <LinkButton href="/admin/login" variant="secondary" block>
        Masuk dengan password
      </LinkButton>
    </AuthCard>
  );
}
