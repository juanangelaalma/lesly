import { requireTeacher } from '@/lib/supabase/require-teacher';
import ProfileForm from '@/components/forms/profile-form';

export default async function SettingsPage() {
  const { supabase, user } = await requireTeacher();
  const { data, error } = await supabase.from('teacher_profiles').select('display_name,timezone').eq('id', user.id).maybeSingle();
  return <><header className="topline"><div><p className="eyebrow">Ruang guru</p><h1>Profil</h1><p className="lede">Informasi akun yang digunakan untuk jadwal dan akses guru.</p></div></header><section className="panel panel-pad"><div className="section-head"><h2>Informasi akun</h2></div>{error ? <div className="notice" role="alert">Profil belum bisa dimuat. Periksa koneksi lalu coba lagi.</div> : <><ProfileForm displayName={data?.display_name || ''} timezone={data?.timezone || 'Asia/Jakarta'} email={user?.email || ''} /><p className="helper" style={{ marginTop: 22 }}>Data profil dipakai untuk menampilkan waktu lokal pada agenda.</p></>}</section><section className="agenda panel panel-pad"><div className="section-head"><h2>Data dan privasi</h2></div><p className="helper">Data murid dan catatan hanya dapat dibaca oleh akun guru yang menyimpannya. Untuk memperoleh salinan data, unduh ekspor akun.</p><a className="button" href="/api/exports">Unduh data akun (CSV)</a></section></>;
}
