'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function UpdatePasswordPage() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') || '');
    if (password.length < 10) { setError('Gunakan kata sandi minimal 10 karakter.'); return; }
    if (password !== form.get('confirmPassword')) { setError('Kata sandi belum sama.'); return; }
    const client = createClient();
    if (!client) { setError('Aplikasi belum terhubung ke Supabase. Kata sandi belum diubah.'); return; }
    setBusy(true);
    const { error: updateError } = await client.auth.updateUser({ password });
    setBusy(false);
    if (updateError) setError('Tautan pemulihan tidak berlaku atau sudah digunakan. Minta tautan baru.');
    else { setMessage('Kata sandi diperbarui. Silakan masuk kembali.'); await client.auth.signOut(); }
  }
  return <main className="auth-page"><section className="auth-story"><Link className="brand brand-name" href="/login">teman les</Link><div><h1>Atur kata sandi baru.</h1><p className="auth-story-copy">Pilih kata sandi yang hanya kamu gunakan untuk akun ini.</p></div><p className="auth-story-foot">Tautan pemulihan hanya dapat digunakan sekali.</p></section><section className="auth-form-side"><form className="auth-form" onSubmit={submit}><div><p className="eyebrow">Keamanan akun</p><h2>Kata sandi baru</h2></div><div className="field"><label htmlFor="password">Kata sandi baru</label><input id="password" name="password" type="password" minLength={10} autoComplete="new-password" required /></div><div className="field"><label htmlFor="confirmPassword">Ulangi kata sandi</label><input id="confirmPassword" name="confirmPassword" type="password" minLength={10} autoComplete="new-password" required /></div>{error && <p className="notice" role="alert">{error}</p>}{message && <p role="status">{message}</p>}<button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan kata sandi baru'}</button><div className="auth-links"><Link href="/login">Kembali ke masuk</Link></div></form></section></main>;
}
