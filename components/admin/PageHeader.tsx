import Link from "next/link";
import { ArrowLeftIcon } from "@phosphor-icons/react/ssr";

/** Kepala halaman dashboard: tautan kembali, judul, info singkat, aksi. */
export default function PageHeader({
  back,
  title,
  meta,
  actions,
}: {
  back?: { href: string; label: string };
  title: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 print:hidden">
      {back ? (
        <Link
          href={back.href}
          className="group mb-4 inline-flex items-center gap-1.5 rounded-md text-sm text-cream/55 transition-colors hover:text-cream"
        >
          <ArrowLeftIcon
            className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5"
            aria-hidden
          />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 space-y-2">
          <h1 className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
            {title}
          </h1>
          {meta ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-cream/55">
              {meta}
            </div>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
