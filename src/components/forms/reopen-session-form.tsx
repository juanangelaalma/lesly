'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { reopenSession, type SessionMutationState } from '@/app/(app)/sessions/actions';

const initialState: SessionMutationState = {};

export default function ReopenSessionForm({ sessionId, version }: { sessionId: string; version: number }) {
  const [state, action, pending] = useActionState(reopenSession, initialState);
  const router = useRouter();
  useEffect(() => { if (state.success) router.refresh(); }, [router, state.success]);
  return <form action={action} className="agenda panel panel-pad"><input type="hidden" name="sessionId" value={sessionId} /><input type="hidden" name="version" value={version} /><div className="section-head"><h2>Koreksi catatan sesi</h2></div><p className="helper" style={{ marginBottom: 16 }}>Membuka ulang sesi akan mengembalikan biaya per sesi bila pembayaran tidak terdampak. Catatan lama disimpan sebagai riwayat dan perlu diperbarui sebelum laporan dibagikan kembali.</p><div className="field"><label htmlFor="reopen-reason">Alasan koreksi *</label><textarea id="reopen-reason" name="reason" maxLength={300} required placeholder="Jelaskan data yang perlu dikoreksi" /></div>{state.error && <p className="notice" role="alert" style={{ marginTop: 14 }}>{state.error}</p>}<div className="form-actions"><button className="button" type="submit" disabled={pending}>{pending ? 'Membuka ulang…' : 'Buka ulang sesi'}</button></div></form>;
}
