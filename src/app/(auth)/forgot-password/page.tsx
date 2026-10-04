import type { Metadata } from "next";

import { RequestPasswordResetForm } from "@/features/auth/reset-forms";

export const metadata: Metadata = { title: "Reset kata sandi" };

export default function ForgotPasswordPage() {
  return (
    <section className="card auth-card" aria-labelledby="reset-title">
      <p className="eyebrow">Bantuan akun</p>
      <h1 id="reset-title">Atur ulang kata sandi</h1>
      <p>
        Masukkan email akunmu. Jika terdaftar, kami akan mengirim tautan reset.
      </p>
      <RequestPasswordResetForm />
    </section>
  );
}
