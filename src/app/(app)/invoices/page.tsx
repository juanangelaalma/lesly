import Link from 'next/link';
import { requireTeacher } from '@/lib/supabase/require-teacher';
import { formatRupiah } from '@/lib/money';
import EnsureInvoicesButton from '@/components/forms/ensure-invoices-button';

export default async function InvoicesPage() {
  const { supabase, user } = await requireTeacher();
  const { data: profile } = await supabase.from('teacher_profiles').select('timezone').eq('id', user.id).maybeSingle();
  const timezone = profile?.timezone || 'Asia/Jakarta';
  const todayLocal = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const monthStart = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit' }).format(new Date()) + '-01';
  const [year, month] = monthStart.split('-').map(Number);
  const nextMonth = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const { data, error } = await supabase.from('invoice_balances').select('id,student_id,period_start,due_date,invoice_number,total_rupiah,paid_rupiah,balance_rupiah').order('period_start', { ascending: false }).limit(100);
  const { data: monthInvoices } = await supabase.from('invoice_balances').select('balance_rupiah').eq('period_start', monthStart);
  const studentIds = [...new Set((data || []).map(invoice => invoice.student_id))];
  const { data: students } = studentIds.length ? await supabase.from('students').select('id,name').in('id', studentIds) : { data: [] };
  const { data: receivedPayments } = await supabase.from('payments').select('amount_rupiah').eq('state', 'posted').gte('received_on', monthStart).lt('received_on', nextMonth);
  const revenueThisMonth = (receivedPayments || []).reduce((total, payment) => total + Number(payment.amount_rupiah), 0);
  const outstandingThisMonth = (monthInvoices || []).reduce((total, invoice) => total + Math.max(0, Number(invoice.balance_rupiah)), 0);
  const names = new Map((students || []).map(student => [student.id, student.name]));
  return <><header className="topline"><div><p className="eyebrow">Pembayaran les</p><h1>Tagihan</h1><p className="lede">Lihat biaya, pembayaran yang sudah dicatat, dan sisa setiap murid.</p></div></header>
    <section className="panel panel-pad" aria-label="Ringkasan bulan ini"><div className="section-head"><h2>Ringkasan bulan ini</h2><span className="status">{new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: timezone }).format(new Date())}</span></div><div className="form-grid"><div><p className="section-label">Pembayaran diterima</p><strong>{formatRupiah(revenueThisMonth)}</strong></div><div><p className="section-label">Sisa tagihan bulan ini</p><strong>{formatRupiah(outstandingThisMonth)}</strong></div></div><p className="helper" style={{ marginTop: 14 }}>Pembayaran dihitung berdasarkan tanggal diterima; sisa tagihan berdasarkan tagihan periode ini.</p></section>
    <div className="section-head"><h2>Tagihan murid</h2><EnsureInvoicesButton /></div>
    {error ? <section className="panel panel-pad empty-state"><h2>Tagihan belum bisa dimuat</h2><p>Periksa koneksi lalu coba lagi.</p></section> : data?.length ? <section className="panel panel-pad card-list">{data.map(invoice => { const balance = Number(invoice.balance_rupiah); const status = balance <= 0 ? 'Lunas' : invoice.due_date < todayLocal ? 'Terlambat' : Number(invoice.paid_rupiah) > 0 ? 'Sebagian' : 'Belum dibayar'; return <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="list-row" style={{ textDecoration: 'none' }}><div className="list-primary"><strong>{names.get(invoice.student_id) || 'Murid'} · {new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: timezone }).format(new Date(`${invoice.period_start}T12:00:00Z`))}</strong><span>Sisa {formatRupiah(balance)} dari {formatRupiah(invoice.total_rupiah)}</span></div><span className="status">{status}</span></Link>; })}</section> : <section className="panel panel-pad empty-state"><div className="empty-mark" aria-hidden="true">▤</div><h2>Belum ada tagihan</h2><p>Siapkan tagihan bulan berjalan setelah menambahkan murid dengan tarif bulanan. Biaya per sesi muncul saat catatan sesi disimpan.</p><Link className="button" href="/students">Lihat daftar murid</Link></section>}
  </>;
}
