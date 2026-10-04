'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createAdHocSession, type AdHocState } from '@/app/(app)/students/actions';

const initialState: AdHocState = {};

export default function AdHocSessionForm({ studentId }: { studentId: string }) {
  const [state, action, pending] = useActionState(createAdHocSession, initialState);
  const router = useRouter();
  useEffect(() => { if (state.sessionId) router.push(`/sessions/${state.sessionId}`); }, [router, state.sessionId]);
  const today = new Date().toLocaleDateString('en-CA');
  return <form action={action}><input type="hidden" name="studentId" value={studentId} /><div className="form-grid"><div className="field"><label htmlFor="session-date">Tanggal pertemuan *</label><input id="session-date" name="date" type="date" max={today} required defaultValue={today} /></div><div className="field"><label htmlFor="session-time">Jam mulai *</label><input id="session-time" name="time" type="time" required defaultValue="15:00" /></div><div className="field"><label htmlFor="session-duration">Durasi (menit) *</label><input id="session-duration" name="duration" type="number" min="15" max="240" step="15" required defaultValue="60" /></div></div><p className="helper" style={{ marginTop: 14 }}>Gunakan sesi ad hoc untuk pertemuan yang lupa dicatat atau jadwal pengganti.</p>{state.error && <p className="notice" role="alert" style={{ marginTop: 16 }}>{state.error}</p>}<div className="form-actions"><button className="button button-primary" type="submit" disabled={pending}>{pending ? 'Menyiapkan sesi…' : 'Tambahkan sesi'}</button></div></form>;
}
