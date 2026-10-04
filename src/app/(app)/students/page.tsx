import Link from 'next/link';
import { requireTeacher } from '@/lib/supabase/require-teacher';

export default async function StudentsPage() {
  const { supabase } = await requireTeacher();
  const { data, error } = await supabase.from('students').select('id,name,grade,guardian_name,archived_at').order('name').limit(100);
  return <>
    <header className="topline"><div><p className="eyebrow">Ruang belajar</p><h1>Murid</h1><p className="lede">Catatan, jadwal, dan tarif yang mengikuti kebutuhan setiap murid.</p></div><Link className="button button-primary" href="/students/new">Tambah murid</Link></header>
    {error ? <section className="panel panel-pad empty-state"><h2>Daftar murid belum bisa dimuat</h2><p>Periksa koneksi lalu coba lagi. Data tetap aman jika jaringan terputus.</p></section> : data?.length ? <section className="panel panel-pad"><div className="section-head"><h2>Daftar murid</h2><span className="helper">{data.length} murid</span></div><div className="card-list">{data.map(student => <Link className="list-row" href={`/students/${student.id}`} key={student.id} style={{ textDecoration: 'none' }}><div className="list-primary"><strong>{student.name}</strong><span>{[student.grade, student.guardian_name].filter(Boolean).join(' · ') || 'Detail belum dilengkapi'}</span></div><span className="status">{student.archived_at ? 'Diarsipkan' : 'Aktif'}</span></Link>)}</div></section> : <section className="panel panel-pad empty-state"><div className="empty-mark" aria-hidden="true">○</div><h2>Belum ada murid</h2><p>Tambahkan data seperlunya. Kontak orang tua boleh dilengkapi nanti, sebelum laporan dibagikan.</p><Link className="button button-primary" href="/students/new">Tambah murid</Link></section>}
  </>;
}
