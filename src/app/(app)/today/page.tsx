import Link from 'next/link';
import { requireTeacher } from '@/lib/supabase/require-teacher';
import { getLocalDayBounds } from '@/lib/dates';
import EnsureScheduleButton from '@/components/forms/ensure-schedule-button';

export default async function TodayPage() {
  const { supabase, user } = await requireTeacher();
  const { data: profile } = await supabase.from('teacher_profiles').select('timezone').eq('id', user.id).maybeSingle();
  const timezone = profile?.timezone || 'Asia/Jakarta';
  const now = new Date();
  const bounds = getLocalDayBounds(now, timezone);
  const { data, error } = await supabase.from('sessions').select('id,starts_at,ends_at,state,students(name,grade)').gte('starts_at', bounds.start).lte('starts_at', bounds.end).order('starts_at').limit(30);
  const today = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', timeZone: timezone }).format(now);
  return <>
    <header className="topline"><div><p className="eyebrow">{today}</p><h1>Hari ini</h1><p className="lede">Satu tempat untuk melihat sesi dan catatan yang perlu dilengkapi.</p></div></header>
    <section className="today-intro"><div><p className="eyebrow">Ruang mengajar</p><h2>Belajar apa hari ini?</h2><p>Jadwal dan catatan pertemuanmu tersusun bersama, supaya kamu siap sebelum mengajar.</p></div></section>
    <section className="agenda" aria-labelledby="agenda-title"><div className="section-head"><h2 id="agenda-title">Agenda mengajar</h2><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}><EnsureScheduleButton /><Link className="button button-quiet" href="/students">Lihat murid</Link></div></div>
      {error ? <div className="empty-state"><h2>Agenda belum bisa dimuat</h2><p>Periksa koneksi lalu muat ulang halaman. Jadwal tidak diubah saat gagal dimuat.</p></div> : data?.length ? <div className="panel panel-pad card-list">{data.map(session => {
        const student = Array.isArray(session.students) ? session.students[0] : session.students;
        const time = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: timezone }).format(new Date(session.starts_at));
        const label = session.state === 'completed' ? 'Sudah dicatat' : session.state === 'student_absent' ? 'Izin' : session.state === 'teacher_cancelled' ? 'Dibatalkan' : 'Belum dicatat';
        return <Link key={session.id} href={`/sessions/${session.id}`} className="list-row" style={{ textDecoration: 'none' }}><div className="list-primary"><strong>{student?.name || 'Murid'}</strong><span>{time}{student?.grade ? ` · ${student.grade}` : ''}</span></div><span className="status">{label}</span></Link>;
      })}</div> : <div className="panel panel-pad empty-state"><div className="empty-mark" aria-hidden="true">◷</div><h2>Belum ada sesi hari ini</h2><p>Tambahkan murid dan jadwal rutin untuk mengisi agenda. Sesi yang belum dicatat tetap bisa ditambahkan dari murid.</p><Link className="button button-primary" href="/students/new">Tambah murid dan jadwal</Link></div>}
    </section>
  </>;
}
