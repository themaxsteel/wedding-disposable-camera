import { Suspense } from "react";
import LoginForm from "@/components/admin/LoginForm";
import AuthCard from "@/components/admin/AuthCard";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <AuthCard
      title="Masuk dashboard"
      description="Lihat dan unduh foto dari para tamu acara kamu."
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
