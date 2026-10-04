'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { completeSession, type SessionFormState } from '@/app/(app)/sessions/actions';

const initialState: SessionFormState = {};

export default function SessionNoteForm({ sessionId, version, previousTopic }: { sessionId: string; version: number; previousTopic?: string }) {
  const [state, action, pending] = useActionState(completeSession, initialState);
  const router = useRouter();
  useEffect(() => { if (state.success) router.push(`/sessions/${sessionId}/report`); }, [router, sessionId, state.success]);
  return <form action={action}>
    <input type="hidden" name="sessionId" value={sessionId} /><input type="hidden" name="expectedVersion" value={version} />
    <div className="form-grid">
      <div className="field wide"><label htmlFor="topic">Materi hari ini *</label><input id="topic" name="topic" required minLength={1} maxLength={120} placeholder="Contoh: Perkalian dua angka" defaultValue={previousTopic} />{previousTopic && <p className="helper">Materi terakhir dimasukkan sebagai awal, silakan sesuaikan.</p>}</div>
      <fieldset className="field wide" style={{ border: 0, padding: 0, margin: 0 }}><legend style={{ marginBottom: 9, fontSize: 14, fontWeight: 700 }}>Bagaimana pemahamannya? *</legend><div className="card-list"><label className="list-row panel" style={{ minHeight: 52, padding: '10px 14px', cursor: 'pointer' }}><span><input type="radio" name="understanding" value="independent" required /> Mandiri</span></label><label className="list-row panel" style={{ minHeight: 52, padding: '10px 14px', cursor: 'pointer' }}><span><input type="radio" name="understanding" value="assisted" /> Masih perlu bantuan</span></label><label className="list-row panel" style={{ minHeight: 52, padding: '10px 14px', cursor: 'pointer' }}><span><input type="radio" name="understanding" value="repeat" /> Perlu diulang</span></label></div></fieldset>
      <div className="field wide"><label htmlFor="note">Catatan atau latihan berikutnya</label><textarea id="note" name="note" maxLength={300} placeholder="Bagian yang perlu dilatih atau rencana pertemuan berikutnya" /></div>
    </div>
    {state.error && <p className="notice" role="alert" style={{ marginTop: 18 }}>{state.error}</p>}
    <div className="form-actions"><button className="button button-primary" type="submit" disabled={pending}>{pending ? 'Menyimpan catatan…' : 'Simpan catatan'}</button></div>
  </form>;
}
