import { Suspense } from "react";
import LoginForm from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6 shell-texture">
      <div className="w-full max-w-sm rounded-2xl border border-cream/10 bg-shell-2/80 p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-film/80">
          Ruang cuci film
        </p>
        <h1 className="mt-2 mb-6 text-xl font-semibold">Masuk dashboard</h1>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
