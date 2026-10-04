'use client';

import { useActionState } from 'react';
import { updateProfile, type ProfileState } from '@/app/(app)/settings/actions';

const initialState: ProfileState = {};

export default function ProfileForm({ displayName, timezone, email }: { displayName: string; timezone: string; email: string }) {
  const [state, action, pending] = useActionState(updateProfile, initialState);
  return <form action={action}><div className="form-grid"><div className="field"><label htmlFor="displayName">Nama tampilan *</label><input id="displayName" name="displayName" required maxLength={100} defaultValue={displayName} /></div><div className="field"><label htmlFor="email">Email akun</label><input id="email" value={email} readOnly /></div><div className="field"><label htmlFor="timezone">Zona waktu</label><select id="timezone" name="timezone" defaultValue={timezone}><option value="Asia/Jakarta">WIB · Asia/Jakarta</option><option value="Asia/Makassar">WITA · Asia/Makassar</option><option value="Asia/Jayapura">WIT · Asia/Jayapura</option></select></div></div>{state.error && <p className="notice" role="alert" style={{ marginTop: 16 }}>{state.error}</p>}{state.success && <p role="status" style={{ marginTop: 16 }}>Profil tersimpan.</p>}<div className="form-actions"><button className="button button-primary" type="submit" disabled={pending}>{pending ? 'Menyimpan…' : 'Simpan profil'}</button></div></form>;
}
