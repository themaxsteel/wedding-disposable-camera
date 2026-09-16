import { Skeleton } from "@/components/ui/States";

export default function AdminLoading() {
  return (
    <main className="mx-auto min-h-dvh max-w-6xl px-4 py-10 sm:px-6" aria-busy="true">
      <span className="sr-only">Memuat</span>
      <Skeleton className="mb-3 h-10 w-64" />
      <Skeleton className="mb-10 h-4 w-40" />
      <div className="space-y-3">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    </main>
  );
}
