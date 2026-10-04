'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateStudent, type StudentFormState } from '@/app/(app)/students/actions';
import { formatRupiah } from '@/lib/money';

const initialState: StudentFormState = {};

export default function StudentEditForm({ student, plan }: { student: { id: string; name: string; grade: string | null; guardian_name: string | null; guardian_phone_e164: string | null; version: number }; plan: { mode: string; rate_rupiah: number; due_day: number } | null }) {
  const [state, action, pending] = useActionState(updateStudent, initialState);
  const router = useRouter();
  useEffect(() => { if (state.success) router.refresh(); }, [router, state.success]);
  return <form action={action}><input type="hidden" name="studentId" value={student.id} /><input type="hidden" name="version" value={student.version} /><div className="form-grid"><div className="field"><label htmlFor="name">Nama murid *</label><input id="name" name="name" required maxLength={100} defaultValue={student.name} /></div><div className="field"><label htmlFor="grade">Kelas</label><input id="grade" name="grade" maxLength={40} defaultValue={student.grade || ''} /></div><div className="field"><label htmlFor="guardianName">Nama orang tua</label><input id="guardianName" name="guardianName" maxLength={100} defaultValue={student.guardian_name || ''} /></div><div className="field"><label htmlFor="guardianPhone">Nomor WhatsApp</label><input id="guardianPhone" name="guardianPhone" type="tel" autoComplete="tel" defaultValue={student.guardian_phone_e164 || ''} /></div><div className="field"><label htmlFor="mode">Model pembayaran</label><select id="mode" name="mode" defaultValue={plan?.mode || 'monthly'}><option value="monthly">Bulanan</option><option value="per_session">Per sesi selesai</option></select></div><div className="field"><label htmlFor="rate">Tarif (Rp)</label><input id="rate" name="rate" type="number" min="1" max="100000000" step="1" defaultValue={plan?.rate_rupiah || ''} required /><p className="helper">Tarif baru berlaku mulai bulan depan. Riwayat tagihan tidak berubah.</p></div><div className="field"><label htmlFor="dueDay">Jatuh tempo (tanggal 1–28)</label><input id="dueDay" name="dueDay" type="number" min="1" max="28" defaultValue={plan?.due_day || 5} required /></div></div>{plan && <p className="helper" style={{ marginTop: 14 }}>Tarif saat ini: {formatRupiah(plan.rate_rupiah)}.</p>}{state.error && <p className="notice" role="alert" style={{ marginTop: 16 }}>{state.error}</p>}{state.success && <p role="status" style={{ marginTop: 16 }}>Perubahan murid tersimpan.</p>}<div className="form-actions"><button className="button button-primary" type="submit" disabled={pending}>{pending ? 'Menyimpan…' : 'Simpan perubahan'}</button></div></form>;
}
