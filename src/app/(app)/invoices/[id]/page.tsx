import { randomUUID } from 'node:crypto';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTeacher } from '@/lib/supabase/require-teacher';
import { formatRupiah } from '@/lib/money';
import PaymentForm from '@/components/forms/payment-form';
import PaymentReminder from '@/components/forms/payment-reminder';
import VoidPaymentForm from '@/components/forms/void-payment-form';
import InvoiceAdjustmentForm from '@/components/forms/invoice-adjustment-form';

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireTeacher();
  const { data: profile } = await supabase.from('teacher_profiles').select('timezone').eq('id', user.id).maybeSingle();
  const timezone = profile?.timezone || 'Asia/Jakarta';
  const { data, error } = await supabase.from('invoice_balances').select('id,student_id,period_start,due_date,invoice_number,total_rupiah,paid_rupiah,balance_rupiah').eq('id', id).maybeSingle();
  if (error) return <section className="panel panel-pad empty-state"><h1>Tagihan belum bisa dimuat</h1><p>Periksa koneksi lalu coba lagi.</p></section>;
  if (!data) notFound();
  const { data: student } = await supabase.from('students').select('name,guardian_name,guardian_phone_e164').eq('id', data.student_id).maybeSingle();
  const { data: items } = await supabase.from('invoice_items').select('id,kind,description,amount_rupiah,state').eq('invoice_id', id).eq('state', 'active').order('created_at');
  const { data: payments } = await supabase.from('payments').select('id,amount_rupiah,received_on,method,state').eq('invoice_id', id).order('created_at', { ascending: false });
  const balance = Number(data.balance_rupiah);
  const total = Number(data.total_rupiah);
  const paid = Number(data.paid_rupiah);
  const requestKey = randomUUID();
  const todayLocal = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const status = balance <= 0 ? 'Lunas' : data.due_date < todayLocal ? 'Terlambat' : paid > 0 ? 'Sebagian' : 'Belum dibayar';
  const period = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: timezone }).format(new Date(`${data.period_start}T12:00:00Z`));
  return <><header className="topline"><div><p className="eyebrow"><Link href="/invoices">Tagihan</Link> / Rincian</p><h1>{student?.name || 'Tagihan'}</h1><p className="lede">{period} · jatuh tempo {new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: timezone }).format(new Date(`${data.due_date}T12:00:00Z`))}</p></div></header>
    <section className="panel panel-pad"><div className="section-head"><h2>Rincian biaya</h2><span className="status">{status}</span></div><div className="card-list">{items?.map(item => <div className="list-row" key={item.id}><div className="list-primary"><strong>{item.description}</strong><span>{item.kind === 'monthly' ? 'Biaya bulanan' : item.kind === 'session' ? 'Sesi selesai' : item.kind === 'adjustment' ? 'Penyesuaian' : 'Saldo awal'}</span></div><strong>{formatRupiah(item.amount_rupiah)}</strong></div>)}</div><div className="list-row"><div className="list-primary"><strong>Total tagihan</strong></div><strong>{formatRupiah(total)}</strong></div><div className="list-row"><div className="list-primary"><strong>Sudah diterima</strong></div><strong>{formatRupiah(paid)}</strong></div><div className="list-row"><div className="list-primary"><strong>Sisa tagihan</strong></div><strong>{formatRupiah(balance)}</strong></div></section>
    {payments?.length ? <section className="agenda"><div className="section-head"><h2>Riwayat pembayaran</h2></div><div className="panel panel-pad card-list">{payments.map(payment => <div className="list-row" style={{ display: 'block' }} key={payment.id}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><div className="list-primary"><strong>{formatRupiah(payment.amount_rupiah)}</strong><span>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: timezone }).format(new Date(`${payment.received_on}T12:00:00Z`))} · {payment.method === 'cash' ? 'Tunai' : 'Transfer'} · {payment.state === 'posted' ? 'Dicatat' : 'Dibatalkan'}</span></div></div>{payment.state === 'posted' && <VoidPaymentForm paymentId={payment.id} invoiceId={id} />}</div>)}</div></section> : null}
    {balance > 0 ? <><section className="agenda panel panel-pad"><div className="section-head"><h2>Catat pembayaran</h2></div><p className="helper" style={{ marginBottom: 18 }}>Nominal tidak boleh melebihi sisa tagihan {formatRupiah(balance)}.</p><PaymentForm key={`${data.id}:${balance}`} invoiceId={data.id} balance={balance} requestKey={requestKey} timezone={timezone} /></section><PaymentReminder studentName={student?.name || 'murid'} guardianName={student?.guardian_name || null} phone={student?.guardian_phone_e164 || null} period={period} total={total} paid={paid} balance={balance} /></> : null}
    <section className="agenda panel panel-pad"><div className="section-head"><h2>Koreksi tagihan</h2></div><p className="helper" style={{ marginBottom: 16 }}>Penyesuaian menambah atau mengurangi total dengan alasan yang tercatat. Total baru tidak dapat berada di bawah pembayaran yang sudah diterima.</p><InvoiceAdjustmentForm invoiceId={id} /></section>
  </>;
}
