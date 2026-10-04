'use client';

import Link from 'next/link';
import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createStudent, type StudentFormState } from '@/app/(app)/students/actions';

const initialState: StudentFormState = {};

export default function StudentForm() {
  const [state, action, pending] = useActionState(createStudent, initialState);
  const router = useRouter();
  useEffect(() => { if (state.success) router.push('/students'); }, [router, state.success]);
  return <form action={action}>
    <div className="form-grid">
      <div className="field"><label htmlFor="name">Nama murid *</label><input id="name" name="name" required maxLength={100} placeholder="Nama panggilan atau nama lengkap" /></div>
      <div className="field"><label htmlFor="grade">Kelas</label><input id="grade" name="grade" maxLength={40} placeholder="Contoh: Kelas 5 SD" /></div>
      <div className="field"><label htmlFor="guardianName">Nama orang tua</label><input id="guardianName" name="guardianName" maxLength={100} placeholder="Nama penerima laporan" /></div>
      <div className="field"><label htmlFor="guardianPhone">Nomor WhatsApp orang tua</label><input id="guardianPhone" name="guardianPhone" type="tel" autoComplete="tel" maxLength={30} placeholder="08… atau +62…" /><p className="helper">Boleh dilengkapi nanti sebelum membagikan laporan.</p></div>
      <div className="field"><label htmlFor="mode">Model pembayaran *</label><select id="mode" name="mode" defaultValue="monthly"><option value="monthly">Bulanan</option><option value="per_session">Per sesi selesai</option></select></div>
      <div className="field"><label htmlFor="rate">Tarif per bulan / sesi (Rp) *</label><input id="rate" name="rate" type="number" min="1" max="100000000" step="1" required inputMode="numeric" placeholder="Contoh: 400000" /><p className="helper">Tarif bulanan tidak berkurang saat murid izin.</p></div>
      <div className="field"><label htmlFor="startsOn">Mulai belajar *</label><input id="startsOn" name="startsOn" type="date" required defaultValue={new Date().toLocaleDateString('en-CA')} /></div>
      <div className="field"><label htmlFor="dueDay">Jatuh tempo bulanan (tanggal 1–28)</label><input id="dueDay" name="dueDay" type="number" min="1" max="28" defaultValue="5" required /></div>
      <div className="field wide"><h2>Jadwal rutin pertama <span className="helper">(opsional)</span></h2><p className="helper">Jadwal dapat ditambahkan atau diubah kapan saja.</p></div>
      <div className="field"><label htmlFor="weekday">Hari</label><select id="weekday" name="weekday" defaultValue=""><option value="">Belum dijadwalkan</option><option value="1">Senin</option><option value="2">Selasa</option><option value="3">Rabu</option><option value="4">Kamis</option><option value="5">Jumat</option><option value="6">Sabtu</option><option value="7">Minggu</option></select></div>
      <div className="field"><label htmlFor="startTime">Jam mulai</label><input id="startTime" name="startTime" type="time" /></div>
      <div className="field"><label htmlFor="duration">Durasi (menit)</label><input id="duration" name="duration" type="number" min="15" max="240" step="15" defaultValue="60" /></div>
    </div>
    <p className="helper" style={{ marginTop: 18 }}>Nomor WhatsApp disimpan hanya untuk dibagikan setelah kamu meninjau laporan.</p>
    {state.error && <p className="notice" role="alert" style={{ marginTop: 18 }}>{state.error}</p>}
    <div className="form-actions"><Link className="button button-quiet" href="/students">Batal</Link><button className="button button-primary" type="submit" disabled={pending}>{pending ? 'Menyimpan…' : 'Simpan murid'}</button></div>
  </form>;
}
