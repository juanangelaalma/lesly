import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/auth/auth-forms";

export const metadata: Metadata = { title: "Lupa kata sandi" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="mb-1 font-display text-3xl font-bold">Lupa kata sandi</h1>
      <p className="mb-5 text-ink-muted">Kami kirim tautan untuk membuat kata sandi baru.</p>
      <ForgotPasswordForm />
    </>
  );
}
