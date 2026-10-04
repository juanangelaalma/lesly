import { createClient } from '@/lib/supabase/server';

function csvCell(value: unknown) {
  let text = value == null ? '' : String(value);
  if (/^[\s\u0000-\u001f]*[=+@\-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return Response.json({ error: 'Supabase belum dikonfigurasi.' }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Masuk untuk mengunduh data akun.' }, { status: 401 });
  const [students, sessions, invoices, payments] = await Promise.all([
    supabase.from('students').select('id,name,grade,guardian_name,guardian_phone_e164,starts_on,ends_on,archived_at').order('created_at'),
    supabase.from('sessions').select('id,student_id,starts_at,ends_at,state,session_notes(understanding,note,learning_topics(name))').order('starts_at'),
    supabase.from('invoice_balances').select('id,student_id,period_start,due_date,invoice_number,total_rupiah,paid_rupiah,balance_rupiah').order('period_start'),
    supabase.from('payments').select('id,invoice_id,amount_rupiah,received_on,method,state').order('received_on'),
  ]);
  if (students.error || sessions.error || invoices.error || payments.error) return Response.json({ error: 'Ekspor belum dapat dibuat. Coba lagi nanti.' }, { status: 500 });
  const rows: unknown[][] = [['jenis','id','murid_id','tanggal','status','rincian','jumlah_rupiah']];
  for (const student of students.data || []) rows.push(['murid',student.id,student.id,student.starts_on,student.archived_at ? 'diarsipkan' : 'aktif',`${student.name}${student.grade ? ` · ${student.grade}` : ''}`,null]);
  for (const session of sessions.data || []) {
    const note = Array.isArray(session.session_notes) ? session.session_notes[0] : session.session_notes;
    const topic = Array.isArray(note?.learning_topics) ? note.learning_topics[0] : note?.learning_topics;
    rows.push(['sesi',session.id,session.student_id,session.starts_at,session.state,[topic?.name,note?.understanding,note?.note].filter(Boolean).join(' · '),null]);
  }
  for (const invoice of invoices.data || []) rows.push(['tagihan',invoice.id,invoice.student_id,invoice.period_start,'aktif',invoice.invoice_number,invoice.total_rupiah]);
  for (const payment of payments.data || []) rows.push(['pembayaran',payment.id,payment.invoice_id,payment.received_on,payment.state,payment.method,payment.amount_rupiah]);
  const csv = `\uFEFF${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}`;
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="teman-les-data.csv"', 'Cache-Control': 'private, no-store, max-age=0' } });
}
