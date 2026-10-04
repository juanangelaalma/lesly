'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getLocalDayBounds, getTimeZoneOffset } from '@/lib/dates';

const sessionSchema = z.object({
  sessionId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
  topic: z.string().trim().min(1, 'Materi wajib diisi.').max(120, 'Materi maksimal 120 karakter.'),
  understanding: z.enum(['independent', 'assisted', 'repeat'], { error: 'Pilih pemahaman murid.' }),
  note: z.string().trim().max(300, 'Catatan maksimal 300 karakter.').optional(),
});

export type SessionFormState = { error?: string; success?: boolean };

export async function completeSession(_previous: SessionFormState, form: FormData): Promise<SessionFormState> {
  const parsed = sessionSchema.safeParse({ sessionId: form.get('sessionId'), expectedVersion: form.get('expectedVersion'), topic: form.get('topic'), understanding: form.get('understanding'), note: form.get('note') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Periksa kembali catatan sesi.' };
  const supabase = await createClient();
  if (!supabase) return { error: 'Aplikasi belum terhubung ke Supabase. Catatan belum tersimpan.' };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesi akun berakhir. Masuk kembali sebelum menyimpan.' };
  const value = parsed.data;
  const { error } = await supabase.rpc('complete_session', { p_session_id: value.sessionId, p_expected_version: value.expectedVersion, p_topic_name: value.topic, p_understanding: value.understanding, p_note: value.note || null });
  if (error) {
    if (error.message.includes('SESSION_IN_FUTURE')) return { error: 'Sesi mendatang belum dapat diselesaikan. Ubah waktu sesi ke waktu yang sudah berlangsung.' };
    if (error.message.includes('CONFLICT')) return { error: 'Sesi telah berubah. Muat ulang sebelum menyimpan koreksi.' };
    return { error: 'Catatan belum tersimpan. Periksa koneksi lalu coba lagi.' };
  }
  revalidatePath('/today');
  revalidatePath(`/sessions/${value.sessionId}`);
  revalidatePath(`/sessions/${value.sessionId}/report`);
  revalidatePath('/invoices');
  return { success: true };
}

export type SessionMutationState = { error?: string; success?: boolean };

export async function rescheduleSession(_previous: SessionMutationState, form: FormData): Promise<SessionMutationState> {
  const parsed = z.object({ sessionId: z.string().uuid(), version: z.coerce.number().int().positive(), date: z.string().date(), time: z.string().regex(/^\d{2}:\d{2}$/), duration: z.coerce.number().int().min(15).max(240) }).safeParse({ sessionId: form.get('sessionId'), version: form.get('version'), date: form.get('date'), time: form.get('time'), duration: form.get('duration') });
  if (!parsed.success) return { error: 'Tanggal, jam, atau durasi sesi belum valid.' };
  const supabase = await createClient();
  if (!supabase) return { error: 'Aplikasi belum terhubung ke Supabase.' };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesi akun berakhir. Masuk kembali.' };
  const { data: profile } = await supabase.from('teacher_profiles').select('timezone').eq('id', user.id).maybeSingle();
  const offset = getTimeZoneOffset(profile?.timezone || 'Asia/Jakarta');
  if (!offset) return { error: 'Zona waktu profil belum didukung.' };
  const startsAt = new Date(`${parsed.data.date}T${parsed.data.time}:00${offset}`);
  if (Number.isNaN(startsAt.getTime())) return { error: 'Tanggal atau jam sesi belum valid.' };
  const endsAt = new Date(startsAt.getTime() + parsed.data.duration * 60_000);
  const { error } = await supabase.rpc('reschedule_session', { p_session_id: parsed.data.sessionId, p_expected_version: parsed.data.version, p_starts_at: startsAt.toISOString(), p_ends_at: endsAt.toISOString() });
  if (error) return { error: error.code === '23P01' ? 'Jadwal bertabrakan dengan sesi lain.' : 'Jadwal belum berubah. Muat ulang dan coba lagi.' };
  revalidatePath('/today');
  revalidatePath(`/sessions/${parsed.data.sessionId}`);
  return { success: true };
}

export async function setSessionState(_previous: SessionMutationState, form: FormData): Promise<SessionMutationState> {
  const parsed = z.object({ sessionId: z.string().uuid(), version: z.coerce.number().int().positive(), state: z.enum(['student_absent', 'teacher_cancelled']), reason: z.string().trim().min(1, 'Alasan wajib diisi.').max(300) }).safeParse({ sessionId: form.get('sessionId'), version: form.get('version'), state: form.get('state'), reason: form.get('reason') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Periksa kembali status sesi.' };
  const supabase = await createClient();
  if (!supabase) return { error: 'Aplikasi belum terhubung ke Supabase.' };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesi akun berakhir. Masuk kembali.' };
  const value = parsed.data;
  const { error } = await supabase.rpc('set_session_state', { p_session_id: value.sessionId, p_expected_version: value.version, p_state: value.state, p_reason: value.reason });
  if (error) return { error: 'Status sesi belum diperbarui. Muat ulang dan coba lagi.' };
  revalidatePath('/today');
  revalidatePath(`/sessions/${value.sessionId}`);
  return { success: true };
}

export async function ensureScheduleWindow(): Promise<SessionMutationState> {
  const supabase = await createClient();
  if (!supabase) return { error: 'Aplikasi belum terhubung ke Supabase.' };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesi akun berakhir. Masuk kembali.' };
  const { data: profile } = await supabase.from('teacher_profiles').select('timezone').eq('id', user.id).maybeSingle();
  const timezone = profile?.timezone || 'Asia/Jakarta';
  const { day } = getLocalDayBounds(new Date(), timezone);
  const from = new Date(`${day}T00:00:00Z`);
  const to = new Date(from.getTime() + 59 * 86_400_000).toISOString().slice(0, 10);
  const { error } = await supabase.rpc('ensure_schedule_window', { p_from: day, p_to: to });
  if (error) return { error: 'Jadwal belum diperbarui. Periksa bentrok waktu atau coba lagi.' };
  revalidatePath('/today');
  return { success: true };
}

export async function reopenSession(_previous: SessionMutationState, form: FormData): Promise<SessionMutationState> {
  const parsed = z.object({ sessionId: z.string().uuid(), version: z.coerce.number().int().positive(), reason: z.string().trim().min(1, 'Alasan wajib diisi.').max(300) }).safeParse({ sessionId: form.get('sessionId'), version: form.get('version'), reason: form.get('reason') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Periksa kembali alasan koreksi.' };
  const supabase = await createClient();
  if (!supabase) return { error: 'Aplikasi belum terhubung ke Supabase.' };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesi akun berakhir. Masuk kembali.' };
  const { error } = await supabase.rpc('reopen_session', { p_session_id: parsed.data.sessionId, p_expected_version: parsed.data.version, p_reason: parsed.data.reason });
  if (error) return { error: error.message.includes('CHARGE_BELOW_PAID') ? 'Tagihan baru akan lebih kecil daripada pembayaran. Koreksi pembayaran atau selesaikan pengembalian uang di luar aplikasi dahulu.' : 'Sesi belum dibuka ulang. Muat ulang lalu coba lagi.' };
  revalidatePath('/today');
  revalidatePath('/invoices');
  revalidatePath(`/sessions/${parsed.data.sessionId}`);
  revalidatePath(`/sessions/${parsed.data.sessionId}/report`);
  return { success: true };
}
