import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <section className="card auth-card" aria-labelledby="login-title">
      <p className="eyebrow">Selamat datang</p>
      <h1 id="login-title">Masuk ke ruang kerjamu</h1>
      <p>Gunakan akun guru yang sudah diundang ke pilot Teman Les.</p>
      <LoginForm />
      <p className="auth-footer">
        Akun dibuat melalui undangan pengelola pilot.
      </p>
    </section>
  );
}
