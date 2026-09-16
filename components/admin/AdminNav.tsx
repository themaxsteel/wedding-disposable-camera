"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FilmStripIcon } from "@phosphor-icons/react/ssr";
import SignOutButton from "@/components/admin/SignOutButton";

const LINKS = [
  { href: "/admin", label: "Acara", match: (path: string) => path !== "/admin/akun" },
  { href: "/admin/akun", label: "Akun", match: (path: string) => path === "/admin/akun" },
];

/** Bar atas dashboard. Tidak tampil di halaman login dan saat mencetak. */
export default function AdminNav() {
  const pathname = usePathname();
  if (pathname === "/admin/login") return null;

  return (
    <header className="sticky top-0 z-(--z-sticky) border-b border-line bg-shell/85 backdrop-blur-md print:hidden">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/admin"
          className="flex items-center gap-2 rounded-lg text-sm font-semibold tracking-tight text-cream"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-film text-shell">
            <FilmStripIcon className="size-4" weight="bold" aria-hidden />
          </span>
          <span className="hidden sm:inline">Ruang cuci film</span>
        </Link>

        <div className="flex items-center gap-1">
          {LINKS.map((link) => {
            const active = link.match(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors duration-200 ${
                  active
                    ? "bg-cream/[0.07] text-cream"
                    : "text-cream/55 hover:bg-cream/[0.04] hover:text-cream"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <span aria-hidden className="mx-1 h-5 w-px bg-line" />
          <SignOutButton />
        </div>
      </nav>
    </header>
  );
}
