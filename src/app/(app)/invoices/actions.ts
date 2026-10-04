'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export type InvoiceActionState = { error?: string; success?: boolean };

export async function recordPayment(_previous: InvoiceActionState, form: FormData): Promise<InvoiceActionState> {
  const parsed = z.object({ invoiceId: z.string().uuid(), requestKey: z.string().uuid(), amount: z.coerce.number().int().positive().max(100_000_000), receivedOn: z.string().date(), method: z.enum(['cash', 'transfer']) }).safeParse({ invoiceId: form.get('invoiceId'), requestKey: form.get('requestKey'), amount: form.get('amount'), receivedOn: form.get('receivedOn'), method: form.get('method') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Periksa kembali data pembayaran.' };
  const supabase = await createClient();
  if (!supabase) return { error: 'Aplikasi belum terhubung ke Supabase. Pembayaran belum dicatat.' };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesi akun berakhir. Masuk kembali sebelum menyimpan.' };
  const value = parsed.data;
  const { error } = await supabase.rpc('record_payment', { p_invoice_id: value.invoiceId, p_amount_rupiah: value.amount, p_received_on: value.receivedOn, p_method: value.method, p_request_key: value.requestKey });
  if (error) return { error: error.message.includes('PAYMENT_EXCEEDS_BALANCE') ? 'Nominal melebihi sisa tagihan. Perbarui jumlah lalu coba lagi.' : error.message.includes('NOT_FOUND') ? 'Tagihan tidak ditemukan.' : 'Pembayaran belum tercatat. Periksa koneksi lalu coba lagi.' };
  revalidatePath('/invoices');
  revalidatePath(`/invoices/${value.invoiceId}`);
  return { success: true };
}

export async function ensureInvoices(): Promise<InvoiceActionState> {
  const supabase = await createClient();
  if (!supabase) return { error: 'Aplikasi belum terhubung ke Supabase.' };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesi akun berakhir. Masuk kembali.' };
  const { data: profile } = await supabase.from('teacher_profiles').select('timezone').eq('id', user.id).maybeSingle();
  const timezone = profile?.timezone || 'Asia/Jakarta';
  const period = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit' }).format(new Date()) + '-01';
  const { error } = await supabase.rpc('ensure_invoices', { p_period_start: period, p_timezone: timezone });
  if (error) return { error: 'Tagihan belum dapat disiapkan. Periksa koneksi lalu coba lagi.' };
  revalidatePath('/invoices');
  return { success: true };
}

export async function voidPayment(_previous: InvoiceActionState, form: FormData): Promise<InvoiceActionState> {
  const parsed = z.object({ paymentId: z.string().uuid(), invoiceId: z.string().uuid(), reason: z.string().trim().min(1, 'Alasan wajib diisi.').max(300) }).safeParse({ paymentId: form.get('paymentId'), invoiceId: form.get('invoiceId'), reason: form.get('reason') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Periksa kembali alasan pembatalan.' };
  const supabase = await createClient();
  if (!supabase) return { error: 'Aplikasi belum terhubung ke Supabase.' };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesi akun berakhir. Masuk kembali.' };
  const { error } = await supabase.rpc('void_payment', { p_payment_id: parsed.data.paymentId, p_reason: parsed.data.reason });
  if (error) return { error: 'Pencatatan belum dibatalkan. Muat ulang dan coba lagi.' };
  revalidatePath('/invoices');
  revalidatePath(`/invoices/${parsed.data.invoiceId}`);
  return { success: true };
}

export async function addInvoiceAdjustment(_previous: InvoiceActionState, form: FormData): Promise<InvoiceActionState> {
  const parsed = z.object({ invoiceId: z.string().uuid(), amount: z.coerce.number().int().min(-100_000_000).max(100_000_000).refine(value => value !== 0, 'Nominal penyesuaian tidak boleh nol.'), description: z.string().trim().min(1).max(120), reason: z.string().trim().min(1).max(300) }).safeParse({ invoiceId: form.get('invoiceId'), amount: form.get('amount'), description: form.get('description'), reason: form.get('reason') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Periksa kembali penyesuaian.' };
  const supabase = await createClient();
  if (!supabase) return { error: 'Aplikasi belum terhubung ke Supabase.' };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesi akun berakhir. Masuk kembali.' };
  const { error } = await supabase.rpc('add_invoice_adjustment', { p_invoice_id: parsed.data.invoiceId, p_amount_signed: parsed.data.amount, p_description: parsed.data.description, p_reason: parsed.data.reason });
  if (error) return { error: error.message.includes('ADJUSTMENT_BELOW_PAID') ? 'Penyesuaian membuat total tagihan lebih kecil daripada pembayaran yang sudah dicatat.' : 'Penyesuaian belum tersimpan. Muat ulang lalu coba lagi.' };
  revalidatePath('/invoices');
  revalidatePath(`/invoices/${parsed.data.invoiceId}`);
  return { success: true };
}
