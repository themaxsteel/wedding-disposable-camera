import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin/access";
import PasswordForm from "@/components/admin/PasswordForm";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ baru?: string }>;
}) {
  const context = await getAdminContext();
  if (!context) redirect("/admin/login");
  const { baru } = await searchParams;

  return (
    <main className="mx-auto min-h-dvh max-w-md p-4 sm:p-6">
      <Link
        href="/admin"
        className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/40 hover:text-film"
      >
        ← semua acara
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{baru ? "Selamat datang 🤍" : "Akun"}</h1>
      <p className="mt-1 mb-6 text-sm text-cream/50">
        {baru
          ? "Buat password supaya lain kali bisa login langsung dengan email ini."
          : `Masuk sebagai ${context.email ?? "—"}`}
      </p>
      <div className="rounded-2xl border border-cream/10 bg-shell-2/60 p-5 sm:p-6">
        <PasswordForm />
      </div>
      {baru ? (
        <Link href="/admin" className="mt-4 inline-block text-xs text-cream/40 underline underline-offset-4">
          Nanti saja, langsung lihat acara
        </Link>
      ) : null}
    </main>
  );
}
