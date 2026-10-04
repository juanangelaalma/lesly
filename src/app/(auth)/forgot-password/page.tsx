'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = createClient();
    if (!client) { setError('Aplikasi belum terhubung ke Supabase. Lengkapi konfigurasi lingkungan untuk melanjutkan.'); return; }
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim();
    const { error: resetError } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/confirm?next=/update-password` });
    if (resetError) setError('Email pemulihan belum dapat dikirim. Coba lagi sebentar.');
    else setMessage('Jika email terdaftar, tautan untuk mengatur ulang kata sandi akan dikirim.');
  }
  return <main className="auth-page"><section className="auth-story"><Link className="brand brand-name" href="/login">teman les</Link><div><h1>Akses akun tetap di tanganmu.</h1><p className="auth-story-copy">Atur ulang kata sandi lewat tautan pemulihan yang dikirim ke email akun.</p></div><p className="auth-story-foot">Teman Les tidak meminta kata sandi lewat pesan.</p></section><section className="auth-form-side"><form className="auth-form" onSubmit={submit}><div><p className="eyebrow">Pemulihan akun</p><h2>Lupa kata sandi?</h2><p className="lede">Masukkan email akun guru untuk menerima tautan pemulihan.</p></div><div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required placeholder="nama@email.com" /></div>{error && <p className="notice" role="alert">{error}</p>}{message && <p className="notice" role="status" style={{ background: 'var(--accent-soft)', color: 'var(--ink)' }}>{message}</p>}<button className="button button-primary" type="submit">Kirim tautan pemulihan</button><div className="auth-links"><Link href="/login">Kembali ke masuk</Link></div></form></section></main>;
}
