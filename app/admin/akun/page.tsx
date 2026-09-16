import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin/access";
import PasswordForm from "@/components/admin/PasswordForm";
import PageHeader from "@/components/admin/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { LinkButton } from "@/components/ui/Button";

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
    <main className="mx-auto min-h-dvh max-w-xl px-4 py-10 sm:px-6">
      <PageHeader
        title={baru ? "Selamat datang" : "Akun"}
        meta={
          baru ? (
            <span>Buat password supaya lain kali bisa langsung masuk dengan email ini.</span>
          ) : (
            <span>
              Masuk sebagai{" "}
              <span className="text-cream">{context.email ?? "email tidak diketahui"}</span>
            </span>
          )
        }
      />
      <Panel>
        <h2 className="mb-5 text-base font-semibold">
          {baru ? "Buat password" : "Ganti password"}
        </h2>
        <PasswordForm />
      </Panel>
      {baru ? (
        <LinkButton href="/admin" variant="ghost" className="mt-4">
          Nanti saja, langsung lihat acara
        </LinkButton>
      ) : null}
    </main>
  );
}
