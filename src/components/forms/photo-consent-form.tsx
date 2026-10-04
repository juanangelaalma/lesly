'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { recordPhotoConsent, withdrawPhotoConsent, type PhotoActionState } from '@/app/(app)/sessions/photo-actions';

const initialState: PhotoActionState = {};

export default function PhotoConsentForm({ studentId, consentDate }: { studentId: string; consentDate: string | null }) {
  const [grantState, grantAction, granting] = useActionState(recordPhotoConsent, initialState);
  const [withdrawState, withdrawAction, withdrawing] = useActionState(withdrawPhotoConsent, initialState);
  const router = useRouter();
  useEffect(() => { if (grantState.success || withdrawState.success) router.refresh(); }, [router, grantState.success, withdrawState.success]);
  const today = new Date().toLocaleDateString('en-CA');
  return <section className="agenda panel panel-pad"><div className="section-head"><h2>Izin foto hasil latihan</h2><span className="status">{consentDate ? 'Izin tercatat' : 'Belum ada izin'}</span></div><p className="helper" style={{ marginBottom: 18 }}>Foto bersifat privat dan hanya menampilkan hasil latihan. Catat izin orang tua sebelum mengunggah. Menarik izin akan menghapus semua foto sesi murid ini.</p><form action={grantAction}><input type="hidden" name="studentId" value={studentId} /><div className="form-grid"><div className="field"><label htmlFor="photo-consent-date">Tanggal izin orang tua *</label><input id="photo-consent-date" name="consentDate" type="date" max={today} defaultValue={consentDate || today} required /></div><div className="field"><label className="check-field"><input name="confirmed" type="checkbox" required /><span>Saya sudah mendapat izin orang tua untuk menyimpan foto hasil latihan.</span></label></div></div><div className="form-actions"><button className="button button-primary" type="submit" disabled={granting}>{granting ? 'Menyimpan…' : consentDate ? 'Perbarui tanggal izin' : 'Catat izin orang tua'}</button></div>{grantState.error && <p className="notice" role="alert" style={{ marginTop: 14 }}>{grantState.error}</p>}{grantState.success && <p role="status" className="notice" style={{ marginTop: 14 }}>{grantState.success}</p>}</form>{consentDate && <form action={withdrawAction} onSubmit={event => { if (!window.confirm('Tarik izin dan hapus semua foto sesi murid ini?')) event.preventDefault(); }} style={{ marginTop: 20 }}><input type="hidden" name="studentId" value={studentId} /><button className="button" type="submit" disabled={withdrawing}>{withdrawing ? 'Menghapus foto…' : 'Tarik izin dan hapus foto'}</button>{withdrawState.error && <p className="notice" role="alert" style={{ marginTop: 12 }}>{withdrawState.error}</p>}{withdrawState.success && <p role="status" className="notice" style={{ marginTop: 12 }}>{withdrawState.success}</p>}</form>}</section>;
}
