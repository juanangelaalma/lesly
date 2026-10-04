import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTeacher } from '@/lib/supabase/require-teacher';
import SessionNoteForm from '@/components/forms/session-note-form';
import SessionManagementForm from '@/components/forms/session-management-form';
import ReopenSessionForm from '@/components/forms/reopen-session-form';
import SessionPhotoForm from '@/components/forms/session-photo-form';

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireTeacher();
  const { data: session, error } = await supabase.from('sessions').select('id,starts_at,ends_at,state,version,student_id,students(name,grade,photo_consent_at),session_notes(understanding,note,learning_topics(name))').eq('id', id).maybeSingle();
  if (error) return <section className="panel panel-pad empty-state"><h1>Sesi belum bisa dibuka</h1><p>Periksa koneksi lalu coba lagi.</p><Link className="button" href="/today">Kembali ke hari ini</Link></section>;
  if (!session) notFound();
  const student = Array.isArray(session.students) ? session.students[0] : session.students;
  const note = Array.isArray(session.session_notes) ? session.session_notes[0] : session.session_notes;
  const topic = Array.isArray(note?.learning_topics) ? note.learning_topics[0] : note?.learning_topics;
  const { data: profile } = await supabase.from('teacher_profiles').select('timezone').eq('id', user.id).maybeSingle();
  const timezone = profile?.timezone || 'Asia/Jakarta';
  const { data: photo } = session.state === 'completed' ? await supabase.from('session_media').select('id,object_path,state').eq('session_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle() : { data: null };
  const { data: signedPhoto } = photo?.state === 'ready' ? await supabase.storage.from('session-photos').createSignedUrl(photo.object_path, 60) : { data: null };
  const when = new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', hour: '2-digit', minute: '2-digit', timeZone: timezone }).format(new Date(session.starts_at));
  let previousNote: (typeof session.session_notes extends (infer T)[] | null ? T : never) | null = null;
  if (!note && session.state === 'scheduled') {
    const { data: previous } = await supabase.from('sessions').select('session_notes(understanding,note,learning_topics(name))').eq('student_id', session.student_id).eq('state', 'completed').neq('id', session.id).order('starts_at', { ascending: false }).limit(1).maybeSingle();
    previousNote = previous?.session_notes ? (Array.isArray(previous.session_notes) ? previous.session_notes[0] : previous.session_notes) : null;
  }
  const previousTopic = previousNote?.learning_topics && (Array.isArray(previousNote.learning_topics) ? previousNote.learning_topics[0] : previousNote.learning_topics);
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(session.starts_at));
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(session.starts_at));
  const duration = Math.round((new Date(session.ends_at).getTime() - new Date(session.starts_at).getTime()) / 60_000);
  const stateLabel = session.state === 'completed' ? 'Sudah dicatat' : session.state === 'student_absent' ? 'Murid izin' : session.state === 'teacher_cancelled' ? 'Dibatalkan' : 'Belum dicatat';
  return <><header className="topline"><div><p className="eyebrow"><Link href="/today">Hari ini</Link> / Sesi</p><h1>{student?.name || 'Detail sesi'}</h1><p className="lede">{when}{student?.grade ? ` · ${student.grade}` : ''}</p></div></header>
    <section className="panel panel-pad"><div className="section-head"><h2>Catatan belajar</h2><span className="status">{stateLabel}</span></div>
      {note ? <><div className="list-primary"><strong>{topic?.name}</strong><span>{note.understanding === 'independent' ? 'Mandiri' : note.understanding === 'assisted' ? 'Masih perlu bantuan' : 'Perlu diulang'}</span>{note.note && <p className="lede">{note.note}</p>}</div><div className="form-actions"><Link className="button button-primary" href={`/sessions/${id}/report`}>Lihat laporan</Link></div></> : session.state === 'scheduled' ? <><div className="panel panel-pad" style={{ marginBottom: 20, background: 'var(--canvas)', boxShadow: 'none' }}><p className="section-label">Terakhir dibahas</p>{previousNote ? <><strong>{previousTopic?.name}</strong><p className="helper">{previousNote.understanding === 'independent' ? 'Mandiri' : previousNote.understanding === 'assisted' ? 'Masih perlu bantuan' : 'Perlu diulang'}{previousNote.note ? ` · ${previousNote.note}` : ''}</p></> : <p className="helper">Belum ada catatan pertemuan sebelumnya.</p>}</div><SessionNoteForm sessionId={session.id} version={session.version} previousTopic={previousTopic?.name} /></> : <div className="empty-state"><h2>Sesi tidak memiliki catatan</h2><p>Sesi izin atau batal tidak ditagih. Catatan hanya tersedia untuk sesi yang berlangsung.</p></div>}
    </section>
    {session.state === 'completed' && <SessionPhotoForm sessionId={id} studentId={session.student_id} consent={Boolean(student?.photo_consent_at)} media={photo ? { id: photo.id, state: photo.state as 'pending' | 'ready' | 'deleted' } : null} photoUrl={signedPhoto?.signedUrl || null} />}
    {session.state === 'completed' && <ReopenSessionForm sessionId={session.id} version={session.version} />}
    {session.state === 'scheduled' && <section className="agenda"><div className="section-head"><h2>Atur sesi</h2></div><SessionManagementForm sessionId={session.id} version={session.version} date={date} time={time} duration={duration} /></section>}
  </>;
}
