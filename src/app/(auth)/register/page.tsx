import type { Metadata } from "next";
import { RegisterForm } from "@/features/auth/auth-forms";

export const metadata: Metadata = { title: "Daftar" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="mb-1 font-display text-3xl font-bold">Buat akun guru</h1>
      <p className="mb-5 text-ink-muted">Gratis selama masa uji coba.</p>
      <RegisterForm />
    </>
  );
}
