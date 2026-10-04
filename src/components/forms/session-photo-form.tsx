'use client';

import Link from 'next/link';
import { useActionState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { removeSessionPhoto, uploadSessionPhoto, type PhotoActionState } from '@/app/(app)/sessions/photo-actions';

const initialState: PhotoActionState = {};

type SessionPhoto = { id: string; state: 'pending' | 'ready' | 'deleted' };

export default function SessionPhotoForm({ sessionId, studentId, consent, media, photoUrl }: { sessionId: string; studentId: string; consent: boolean; media: SessionPhoto | null; photoUrl: string | null }) {
  const [uploadState, uploadAction, uploading] = useActionState(uploadSessionPhoto, initialState);
  const [removeState, removeAction, removing] = useActionState(removeSessionPhoto, initialState);
  const router = useRouter();
  useEffect(() => { if (uploadState.success || removeState.success) router.refresh(); }, [router, uploadState.success, removeState.success]);
  const canUpload = consent && (!media || media.state === 'deleted');
  return <section className="agenda panel panel-pad"><div className="section-head"><h2>Foto hasil latihan</h2><span className="status">{media?.state === 'ready' ? 'Foto privat' : consent ? 'Opsional' : 'Izin belum dicatat'}</span></div><p className="helper" style={{ marginBottom: 16 }}>Satu foto latihan, maksimal 5 MB. Foto diproses untuk menghapus metadata lokasi dan tidak pernah memiliki tautan publik.</p>
    {media?.state === 'ready' && photoUrl ? <div className="photo-preview"><Image src={photoUrl} alt="Hasil latihan murid" width={1600} height={1600} unoptimized style={{ width: 'auto', height: 'auto' }} /><div className="form-actions" style={{ justifyContent: 'flex-start', marginTop: 0 }}><a className="button" href={`/api/session-photos/${media.id}`}>Unduh foto</a><form action={removeAction} onSubmit={event => { if (!window.confirm('Hapus foto hasil latihan ini?')) event.preventDefault(); }}><input type="hidden" name="mediaId" value={media.id} /><input type="hidden" name="sessionId" value={sessionId} /><button className="button" type="submit" disabled={removing}>{removing ? 'Menghapus…' : 'Hapus foto'}</button></form></div></div> : media ? <form action={removeAction}><input type="hidden" name="mediaId" value={media.id} /><input type="hidden" name="sessionId" value={sessionId} /><p className="helper">{media.state === 'pending' ? 'Unggahan sebelumnya belum selesai.' : media.state === 'ready' ? 'Foto tersimpan secara privat tetapi pratinjau belum dapat dibuka.' : 'Penghapusan berkas sebelumnya belum selesai.'} Foto tetap privat dan tidak ditampilkan.</p><button className="button" type="submit" disabled={removing}>{removing ? 'Membersihkan…' : media.state === 'ready' ? 'Hapus foto' : 'Selesaikan penghapusan foto'}</button></form> : null}
    {canUpload ? <form action={uploadAction} style={{ marginTop: 16 }}><input type="hidden" name="sessionId" value={sessionId} /><div className="field"><label htmlFor={`session-photo-${sessionId}`}>Pilih foto JPEG, PNG, atau WebP</label><input id={`session-photo-${sessionId}`} name="photo" type="file" accept="image/jpeg,image/png,image/webp" required /></div><div className="form-actions"><button className="button button-primary" type="submit" disabled={uploading}>{uploading ? 'Memproses foto…' : 'Unggah foto privat'}</button></div></form> : !consent && media?.state !== 'ready' ? <p className="helper\"><Link href={`/students/${studentId}`}>Catat izin orang tua</Link> di detail murid sebelum mengunggah foto.</p> : null}
  </section>;
}
