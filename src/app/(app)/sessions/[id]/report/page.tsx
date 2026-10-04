import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTeacher } from '@/lib/supabase/require-teacher';
import ReportActions from '@/components/forms/report-actions';

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireTeacher();
  const { data: profile } = await supabase.from('teacher_profiles').select('timezone').eq('id', user.id).maybeSingle();
  const timezone = profile?.timezone || 'Asia/Jakarta';
  const { data, error } = await supabase.from('sessions').select('id,starts_at,state,students(name,guardian_name,guardian_phone_e164),session_notes(understanding,note,learning_topics(name))').eq('id', id).maybeSingle();
  if (error) return <section className="panel panel-pad empty-state"><h1>Laporan belum bisa dimuat</h1><p>Periksa koneksi lalu coba lagi.</p></section>;
  if (!data) notFound();
  const student = Array.isArray(data.students) ? data.students[0] : data.students;
  const note = Array.isArray(data.session_notes) ? data.session_notes[0] : data.session_notes;
  if (!note || data.state !== 'completed') return <section className="panel panel-pad empty-state"><h1>Laporan belum tersedia</h1><p>Simpan catatan sesi terlebih dahulu untuk meninjau laporan.</p><Link className="button" href={`/sessions/${id}`}>Kembali ke sesi</Link></section>;
  const topic = Array.isArray(note.learning_topics) ? note.learning_topics[0] : note.learning_topics;
  const date = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: timezone }).format(new Date(data.starts_at));
  const understanding = note.understanding === 'independent' ? 'mandiri' : note.understanding === 'assisted' ? 'masih perlu bantuan' : 'perlu diulang';
  const lines = [`Halo${student?.guardian_name ? ` ${student.guardian_name}` : ''}, berikut catatan belajar ${student?.name} pada ${date}.`, '', `Materi: ${topic?.name}.`, `Pemahaman: ${understanding}.`, ...(note.note ? [`Catatan: ${note.note}`] : []), '', 'Terima kasih sudah mendampingi proses belajarnya.'];
  const text = lines.join('\n');
  const digits = (student?.guardian_phone_e164 || '').replace(/\D/g, '');
  const whatsappUrl = digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
  return <><header className="topline"><div><p className="eyebrow"><Link href={`/sessions/${id}`}>Sesi</Link> / Laporan</p><h1>Lihat laporan</h1><p className="lede">Periksa isi dan nama penerima sebelum membukanya di WhatsApp.</p></div></header><section className="panel panel-pad"><div className="section-head"><h2>Catatan untuk orang tua</h2></div><div style={{ whiteSpace: 'pre-wrap', borderRadius: 12, background: 'var(--canvas)', padding: 20, lineHeight: 1.8 }}>{text}</div><p className="helper" style={{ marginTop: 16 }}>{student?.guardian_name ? `Penerima: ${student.guardian_name}` : 'Nama orang tua belum dicatat.'} {digits ? 'Periksa nomor penerima di WhatsApp sebelum mengirim.' : 'WhatsApp akan dibuka tanpa nomor penerima tersimpan.'}</p><ReportActions text={text} whatsappUrl={whatsappUrl} /></section></>;
}
