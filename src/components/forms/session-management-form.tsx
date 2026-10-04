'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { rescheduleSession, setSessionState, type SessionMutationState } from '@/app/(app)/sessions/actions';

const initialState: SessionMutationState = {};

export default function SessionManagementForm({ sessionId, version, date, time, duration }: { sessionId: string; version: number; date: string; time: string; duration: number }) {
  const [moveState, moveAction, moving] = useActionState(rescheduleSession, initialState);
  const [statusState, statusAction, changingState] = useActionState(setSessionState, initialState);
  const router = useRouter();
  useEffect(() => { if (moveState.success || statusState.success) router.refresh(); }, [moveState.success, router, statusState.success]);
  return <div className="card-list">
    <form action={moveAction} className="panel panel-pad"><input type="hidden" name="sessionId" value={sessionId} /><input type="hidden" name="version" value={version} /><div className="section-head"><h2>Pindah jadwal</h2></div><div className="form-grid"><div className="field"><label htmlFor="move-date">Tanggal baru</label><input id="move-date" name="date" type="date" required defaultValue={date} /></div><div className="field"><label htmlFor="move-time">Jam mulai baru</label><input id="move-time" name="time" type="time" required defaultValue={time} /></div><div className="field"><label htmlFor="move-duration">Durasi (menit)</label><input id="move-duration" name="duration" type="number" min="15" max="240" step="15" required defaultValue={duration} /></div></div>{moveState.error && <p className="notice" role="alert" style={{ marginTop: 14 }}>{moveState.error}</p>}{moveState.success && <p role="status" style={{ marginTop: 14 }}>Jadwal sesi diperbarui.</p>}<div className="form-actions"><button className="button" type="submit" disabled={moving}>{moving ? 'Memindahkan…' : 'Simpan jadwal baru'}</button></div></form>
    <form action={statusAction} className="panel panel-pad"><input type="hidden" name="sessionId" value={sessionId} /><input type="hidden" name="version" value={version} /><div className="section-head"><h2>Izin atau pembatalan</h2></div><div className="form-grid"><div className="field"><label htmlFor="session-state">Status sesi</label><select id="session-state" name="state" defaultValue="student_absent"><option value="student_absent">Murid izin</option><option value="teacher_cancelled">Guru membatalkan</option></select></div><div className="field"><label htmlFor="state-reason">Alasan *</label><input id="state-reason" name="reason" maxLength={300} required placeholder="Catatan singkat untuk riwayat" /></div></div><p className="helper" style={{ marginTop: 12 }}>Izin dan pembatalan tidak menambahkan biaya per sesi.</p>{statusState.error && <p className="notice" role="alert" style={{ marginTop: 14 }}>{statusState.error}</p>}{statusState.success && <p role="status" style={{ marginTop: 14 }}>Status sesi diperbarui.</p>}<div className="form-actions"><button className="button" type="submit" disabled={changingState}>{changingState ? 'Memperbarui…' : 'Simpan status'}</button></div></form>
  </div>;
}
