import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTeacher } from '@/lib/supabase/require-teacher';
import { formatRupiah } from '@/lib/money';
import StudentEditForm from '@/components/forms/student-edit-form';
import ArchiveStudentForm from '@/components/forms/archive-student-form';
import AdHocSessionForm from '@/components/forms/ad-hoc-session-form';
import PhotoConsentForm from '@/components/forms/photo-consent-form';

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireTeacher();
  const { data: profile } = await supabase.from('teacher_profiles').select('timezone').eq('id', user.id).maybeSingle();
  const timezone = profile?.timezone || 'Asia/Jakarta';
  const { data: student, error } = await supabase.from('students').select('id,name,grade,guardian_name,guardian_phone_e164,starts_on,archived_at,photo_consent_at,version').eq('id', id).maybeSingle();
  if (error) return <section className="panel panel-pad empty-state"><h1>Data murid belum bisa dimuat</h1><p>Periksa koneksi lalu coba lagi.</p></section>;
  if (!student) notFound();
  const localMonth = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit' }).format(new Date()) + '-01';
  const [{ data: plan }, { data: sessions }, { data: invoices }] = await Promise.all([
    supabase.from('billing_plans').select('mode,rate_rupiah,due_day').eq('student_id', id).lte('effective_month', localMonth).order('effective_month', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('sessions').select('id,starts_at,state,session_notes(understanding,note,learning_topics(name))').eq('student_id', id).order('starts_at', { ascending: false }).limit(20),
    supabase.from('invoice_balances').select('id,period_start,invoice_number,total_rupiah,paid_rupiah,balance_rupiah').eq('student_id', id).order('period_start', { ascending: false }).limit(6),
  ]);
  const progressByTopic = new Map<string, { count: number; latest: string }>();
  for (const session of sessions || []) {
    const note = Array.isArray(session.session_notes) ? session.session_notes[0] : session.session_notes;
    const topic = Array.isArray(note?.learning_topics) ? note.learning_topics[0] : note?.learning_topics;
    if (!note || !topic?.name) continue;
    const progress = progressByTopic.get(topic.name);
    if (progress) progress.count += 1;
    else progressByTopic.set(topic.name, { count: 1, latest: note.understanding });
  }
  return <><header className="topline"><div><p className="eyebrow"><Link href="/students">Murid</Link> / Detail</p><h1>{student.name}</h1><p className="lede">{[student.grade, student.archived_at ? 'Diarsipkan' : 'Aktif'].filter(Boolean).join(' · ')}</p></div></header>
    <section className="panel panel-pad"><div className="section-head"><h2>Data murid dan tarif</h2></div><StudentEditForm student={student} plan={plan ? { ...plan, rate_rupiah: Number(plan.rate_rupiah) } : null} /></section>
    <PhotoConsentForm studentId={student.id} consentDate={student.photo_consent_at} />
    <section className="agenda"><div className="section-head"><h2>Kemajuan belajar per materi</h2></div><p className="helper" style={{ marginBottom: 12 }}>Ringkasan berdasarkan catatan hingga 20 sesi terbaru, bukan penilaian otomatis.</p>{progressByTopic.size ? <div className="panel panel-pad card-list">{Array.from(progressByTopic.entries()).map(([topic, progress]) => <div className="list-row" key={topic}><div className="list-primary"><strong>{topic}</strong><span>{progress.count} sesi tercatat</span></div><span className="status">{progress.latest === 'independent' ? 'Terakhir: mandiri' : progress.latest === 'assisted' ? 'Terakhir: dengan bantuan' : 'Terakhir: perlu diulang'}</span></div>)}</div> : <div className="panel panel-pad empty-state"><p>Belum ada pola materi untuk diringkas. Catat sesi belajar untuk melihat perkembangannya.</p></div>}</section>
    {!student.archived_at && <section className="agenda panel panel-pad"><div className="section-head"><h2>Akhiri jadwal murid</h2></div><ArchiveStudentForm studentId={student.id} startsOn={student.starts_on} /></section>}
    {!student.archived_at && <section className="agenda panel panel-pad"><div className="section-head"><h2>Tambah sesi yang belum tercatat</h2></div><AdHocSessionForm studentId={student.id} /></section>}
    <section className="agenda"><div className="section-head"><h2>Riwayat sesi</h2></div>{sessions?.length ? <div className="panel panel-pad card-list">{sessions.map(session => { const note = Array.isArray(session.session_notes) ? session.session_notes[0] : session.session_notes; const topic = Array.isArray(note?.learning_topics) ? note.learning_topics[0] : note?.learning_topics; return <Link className="list-row" key={session.id} href={`/sessions/${session.id}`} style={{ textDecoration: 'none' }}><div className="list-primary"><strong>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: timezone }).format(new Date(session.starts_at))}</strong><span>{topic?.name || 'Belum ada catatan'}</span></div><span className="status">{session.state === 'completed' ? 'Selesai' : session.state === 'student_absent' ? 'Izin' : session.state === 'teacher_cancelled' ? 'Batal' : 'Belum dicatat'}</span></Link>; })}</div> : <div className="panel panel-pad empty-state"><h2>Belum ada riwayat sesi</h2><p>Riwayat akan tampil setelah jadwal pertama dibuat.</p></div>}</section>
    <section className="agenda"><div className="section-head"><h2>Tagihan terakhir</h2><Link className="button button-quiet" href="/invoices">Semua tagihan</Link></div>{invoices?.length ? <div className="panel panel-pad card-list">{invoices.map(invoice => <Link className="list-row" key={invoice.id} href={`/invoices/${invoice.id}`} style={{ textDecoration: 'none' }}><div className="list-primary"><strong>{new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: timezone }).format(new Date(`${invoice.period_start}T12:00:00Z`))}</strong><span>Sisa {formatRupiah(invoice.balance_rupiah)} dari {formatRupiah(invoice.total_rupiah)}</span></div><span className="status">{Number(invoice.balance_rupiah) <= 0 ? 'Lunas' : Number(invoice.paid_rupiah) > 0 ? 'Sebagian' : 'Belum dibayar'}</span></Link>)}</div> : <div className="panel panel-pad empty-state"><h2>Belum ada tagihan</h2><p>Tagihan bulanan muncul saat periode disiapkan. Biaya per sesi muncul setelah sesi selesai dicatat.</p><Link className="button" href="/invoices">Buka tagihan</Link></div>}</section>
  </>;
}
