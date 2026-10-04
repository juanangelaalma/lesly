'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

function Brand() {
  return <Link className="brand brand-name" href="/login">teman les</Link>;
}

export default function LoginPage() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const client = createClient();
    if (!client) {
      setError('Aplikasi belum terhubung ke Supabase. Lengkapi konfigurasi lingkungan untuk masuk.');
      return;
    }
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    setBusy(true);
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (signInError) {
      setError(signInError.message === 'Invalid login credentials' ? 'Email atau kata sandi belum cocok.' : 'Belum bisa masuk. Periksa koneksi dan coba lagi.');
      return;
    }
    window.location.assign('/today');
  }

  return <main className="auth-page">
    <section className="auth-story" aria-label="Tentang Teman Les">
      <Brand />
      <div><h1>Catatan rapi, pikiran lebih lega.</h1><p className="auth-story-copy">Jadwal mengajar, catatan belajar, dan pembayaran murid, tersusun dalam satu tempat.</p></div>
      <p className="auth-story-foot">Teman Les membantu merapikan proses belajar, bukan menggantikan penilaian guru.</p>
    </section>
    <section className="auth-form-side">
      <form className="auth-form" onSubmit={submit}>
        <div><p className="eyebrow">Ruang guru</p><h2>Masuk ke akun</h2><p className="lede">Lanjutkan mengelola jadwal dan catatan les.</p></div>
        <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required placeholder="nama@email.com" /></div>
        <div className="field"><label htmlFor="password">Kata sandi</label><input id="password" name="password" type="password" autoComplete="current-password" required placeholder="Masukkan kata sandi" /></div>
        {error && <p className="notice" role="alert">{error}</p>}
        <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Memeriksa akun…' : 'Masuk'}</button>
        <div className="auth-links"><span>Akses khusus guru pilot</span><Link href="/forgot-password">Lupa kata sandi?</Link></div>
      </form>
    </section>
  </main>;
}
