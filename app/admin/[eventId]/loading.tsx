import { Skeleton } from "@/components/ui/States";

export default function EventLoading() {
  return (
    <main className="mx-auto min-h-dvh max-w-6xl px-4 py-10 sm:px-6" aria-busy="true">
      <span className="sr-only">Memuat</span>
      <Skeleton className="mb-4 h-4 w-28" />
      <Skeleton className="mb-3 h-10 w-72" />
      <Skeleton className="mb-10 h-4 w-52" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="aspect-square w-full" />
        ))}
      </div>
    </main>
  );
}
