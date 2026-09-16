import { ArrowRightIcon, CameraIcon, FilmStripIcon, ImagesIcon } from "@phosphor-icons/react/ssr";
import { LinkButton } from "@/components/ui/Button";

const FLOW = [
  {
    icon: <CameraIcon weight="duotone" />,
    title: "Tamu memindai QR di meja",
    body: "Ketik nama, lalu kamera langsung terbuka di browser. Tanpa unduh aplikasi.",
  },
  {
    icon: <FilmStripIcon weight="duotone" />,
    title: "Satu rol film per tamu",
    body: "Jatah jepretan terbatas dan hasilnya tidak bisa diintip, seperti kamera sekali pakai.",
  },
  {
    icon: <ImagesIcon weight="duotone" />,
    title: "Pengantin menerima semuanya",
    body: "Foto asli dan versi film terkumpul per tamu, siap diunduh setelah acara.",
  },
];

export default function HomePage() {
  return (
    <main className="shell-texture min-h-dvh px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto grid max-w-5xl gap-14 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-20">
        <div className="reveal space-y-6">
          <h1 className="text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Kamera sekali pakai untuk tamu pernikahan
          </h1>
          <p className="max-w-[44ch] text-base leading-relaxed text-cream/65 sm:text-lg">
            Tamu memotret dari HP masing-masing. Hasilnya baru dicuci untuk pengantin setelah
            acara selesai.
          </p>
          <LinkButton
            href="/admin"
            size="lg"
            icon={<ArrowRightIcon className="size-5" weight="bold" aria-hidden />}
            className="flex-row-reverse"
          >
            Masuk dashboard
          </LinkButton>
        </div>

        <ol className="reveal space-y-3 [animation-delay:140ms]">
          {FLOW.map((step) => (
            <li
              key={step.title}
              className="body-plastic flex gap-4 rounded-2xl border border-line p-5"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-line bg-shell text-film [&_svg]:size-5">
                {step.icon}
              </span>
              <div>
                <p className="font-medium">{step.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-cream/60">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
