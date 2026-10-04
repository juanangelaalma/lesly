'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { archiveStudent, type StudentFormState } from '@/app/(app)/students/actions';

const initialState: StudentFormState = {};

export default function ArchiveStudentForm({ studentId, startsOn }: { studentId: string; startsOn: string }) {
  const [state, action, pending] = useActionState(archiveStudent, initialState);
  const router = useRouter();
  useEffect(() => { if (state.success) router.push('/students'); }, [router, state.success]);
  const today = new Date().toLocaleDateString('en-CA');
  return <form action={action}><input type="hidden" name="studentId" value={studentId} /><div className="form-grid"><div className="field"><label htmlFor="endsOn">Hari terakhir belajar *</label><input id="endsOn" name="endsOn" type="date" min={startsOn} max={today} defaultValue={today} required /></div><div className="field"><label htmlFor="reason">Alasan arsip *</label><input id="reason" name="reason" maxLength={300} required placeholder="Alasan singkat untuk jejak perubahan" /></div></div><p className="helper" style={{ marginTop: 14 }}>Jadwal mendatang dihentikan. Tagihan dan riwayat pembayaran tetap dapat dilihat.</p>{state.error && <p className="notice" role="alert" style={{ marginTop: 16 }}>{state.error}</p>}<div className="form-actions"><button className="button" type="submit" disabled={pending}>{pending ? 'Mengarsipkan…' : 'Arsipkan murid'}</button></div></form>;
}
