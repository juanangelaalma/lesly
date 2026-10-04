import type { Metadata } from "next";

import { UpdatePasswordForm } from "@/features/auth/reset-forms";

export const metadata: Metadata = { title: "Kata sandi baru" };

export default function UpdatePasswordPage() {
  return (
    <section className="card auth-card" aria-labelledby="new-password-title">
      <p className="eyebrow">Hampir selesai</p>
      <h1 id="new-password-title">Buat kata sandi baru</h1>
      <p>Pilih kata sandi baru untuk akun Teman Les-mu.</p>
      <UpdatePasswordForm />
    </section>
  );
}
