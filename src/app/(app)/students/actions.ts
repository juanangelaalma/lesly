'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { normalizePhone } from '@/lib/phone';
import { getTimeZoneOffset } from '@/lib/dates';

const studentSchema = z.object({
  name: z.string().trim().min(1, 'Nama murid wajib diisi.').max(100),
  grade: z.string().trim().max(40).optional(),
  guardianName: z.string().trim().max(100).optional(),
  guardianPhone: z.string().trim().max(30).optional(),
  mode: z.enum(['monthly', 'per_session']),
  rate: z.coerce.number().int().positive().max(100_000_000, 'Tarif maksimal Rp100.000.000.'),
  startsOn: z.string().date(),
  dueDay: z.coerce.number().int().min(1).max(28),
  weekday: z.coerce.number().int().min(1).max(7).optional(),
  startTime: z.string().optional(),
  duration: z.coerce.number().int().min(15).max(240).optional(),
});

export type StudentFormState = { error?: string; success?: boolean };

export async function createStudent(_previous: StudentFormState, form: FormData): Promise<StudentFormState> {
  const parsed = studentSchema.safeParse({
    name: form.get('name'), grade: form.get('grade'), guardianName: form.get('guardianName'), guardianPhone: form.get('guardianPhone'),
    mode: form.get('mode'), rate: form.get('rate'), startsOn: form.get('startsOn'), dueDay: form.get('dueDay'),
    weekday: form.get('weekday') || undefined, startTime: form.get('startTime') || undefined, duration: form.get('duration') || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Periksa kembali data murid.' };
  const value = parsed.data;
  const normalizedPhone = value.guardianPhone ? normalizePhone(value.guardianPhone) : null;
  if (value.guardianPhone && !normalizedPhone) return { error: 'Nomor WhatsApp belum valid. Gunakan format 08… atau +62…' };
  const supabase = await createClient();
  if (!supabase) return { error: 'Aplikasi belum terhubung ke Supabase. Data belum disimpan.' };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesi akun berakhir. Masuk kembali sebelum menyimpan.' };
  const { data: profile } = await supabase.from('teacher_profiles').select('timezone').eq('id', user.id).maybeSingle();
  const { error } = await supabase.rpc('create_student', {
    p_name: value.name, p_grade: value.grade || null, p_guardian_name: value.guardianName || null,
    p_guardian_phone: normalizedPhone, p_mode: value.mode, p_rate_rupiah: value.rate, p_starts_on: value.startsOn,
    p_due_day: value.dueDay, p_weekday: value.weekday ?? null, p_local_start: value.startTime || null,
    p_duration_minutes: value.duration ?? null, p_timezone: profile?.timezone || 'Asia/Jakarta',
  });
  if (error) return { error: error.code === '23P01' ? 'Jadwal tersebut bertabrakan dengan sesi lain.' : 'Murid belum tersimpan. Periksa koneksi lalu coba lagi.' };
  revalidatePath('/students');
  revalidatePath('/today');
  return { success: true };
}

function nextLocalMonth(timezone: string) {
  const localMonth = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit' }).format(new Date());
  const [year, month] = localMonth.split('-').map(Number);
  const next = new Date(Date.UTC(year, month, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

export async function updateStudent(_previous: StudentFormState, form: FormData): Promise<StudentFormState> {
  const parsed = z.object({ studentId: z.string().uuid(), version: z.coerce.number().int().positive(), name: z.string().trim().min(1).max(100), grade: z.string().trim().max(40).optional(), guardianName: z.string().trim().max(100).optional(), guardianPhone: z.string().trim().max(30).optional(), mode: z.enum(['monthly', 'per_session']), rate: z.coerce.number().int().positive().max(100_000_000), dueDay: z.coerce.number().int().min(1).max(28) }).safeParse({ studentId: form.get('studentId'), version: form.get('version'), name: form.get('name'), grade: form.get('grade'), guardianName: form.get('guardianName'), guardianPhone: form.get('guardianPhone'), mode: form.get('mode'), rate: form.get('rate'), dueDay: form.get('dueDay') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Periksa kembali data murid.' };
  const value = parsed.data;
  const phone = value.guardianPhone ? normalizePhone(value.guardianPhone) : null;
  if (value.guardianPhone && !phone) return { error: 'Nomor WhatsApp belum valid. Gunakan format 08… atau +62…' };
  const supabase = await createClient();
  if (!supabase) return { error: 'Aplikasi belum terhubung ke Supabase. Perubahan belum disimpan.' };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesi akun berakhir. Masuk kembali.' };
  const { data: profile } = await supabase.from('teacher_profiles').select('timezone').eq('id', user.id).maybeSingle();
  const timezone = profile?.timezone || 'Asia/Jakarta';
  const { error } = await supabase.rpc('update_student', { p_student_id: value.studentId, p_expected_version: value.version, p_name: value.name, p_grade: value.grade || null, p_guardian_name: value.guardianName || null, p_guardian_phone: phone, p_mode: value.mode, p_rate_rupiah: value.rate, p_due_day: value.dueDay, p_effective_month: nextLocalMonth(timezone) });
  if (error) return { error: error.message.includes('CONFLICT') ? 'Data murid berubah. Muat ulang sebelum menyimpan.' : 'Perubahan belum tersimpan. Periksa koneksi lalu coba lagi.' };
  revalidatePath('/students');
  revalidatePath(`/students/${value.studentId}`);
  return { success: true };
}

export async function archiveStudent(_previous: StudentFormState, form: FormData): Promise<StudentFormState> {
  const parsed = z.object({ studentId: z.string().uuid(), endsOn: z.string().date(), reason: z.string().trim().min(1, 'Alasan wajib diisi.').max(300) }).safeParse({ studentId: form.get('studentId'), endsOn: form.get('endsOn'), reason: form.get('reason') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Periksa kembali data arsip.' };
  const supabase = await createClient();
  if (!supabase) return { error: 'Aplikasi belum terhubung ke Supabase.' };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesi akun berakhir. Masuk kembali.' };
  const { data: profile } = await supabase.from('teacher_profiles').select('timezone').eq('id', user.id).maybeSingle();
  const { error } = await supabase.rpc('archive_student', { p_student_id: parsed.data.studentId, p_ends_on: parsed.data.endsOn, p_reason: parsed.data.reason, p_timezone: profile?.timezone || 'Asia/Jakarta' });
  if (error) return { error: 'Murid belum diarsipkan. Tunggakan dan riwayat tetap tersimpan.' };
  revalidatePath('/students');
  revalidatePath('/today');
  return { success: true };
}


export type AdHocState = { error?: string; sessionId?: string };

export async function createAdHocSession(_previous: AdHocState, form: FormData): Promise<AdHocState> {
  const parsed = z.object({ studentId: z.string().uuid(), date: z.string().date(), time: z.string().regex(/^\d{2}:\d{2}$/), duration: z.coerce.number().int().min(15).max(240) }).safeParse({ studentId: form.get('studentId'), date: form.get('date'), time: form.get('time'), duration: form.get('duration') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Periksa kembali tanggal sesi.' };
  const supabase = await createClient();
  if (!supabase) return { error: 'Aplikasi belum terhubung ke Supabase.' };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesi akun berakhir. Masuk kembali.' };
  const { data: profile } = await supabase.from('teacher_profiles').select('timezone').eq('id', user.id).maybeSingle();
  const timezone = profile?.timezone || 'Asia/Jakarta';
  const offset = getTimeZoneOffset(timezone);
  if (!offset) return { error: 'Zona waktu profil belum didukung.' };
  const startsAt = new Date(`${parsed.data.date}T${parsed.data.time}:00${offset}`);
  if (Number.isNaN(startsAt.getTime())) return { error: 'Tanggal atau jam sesi belum valid.' };
  const { data: sessionId, error } = await supabase.rpc('create_ad_hoc_session', { p_student_id: parsed.data.studentId, p_starts_at: startsAt.toISOString(), p_duration_minutes: parsed.data.duration });
  if (error || !sessionId) return { error: error?.code === '23P01' ? 'Waktu sesi bertabrakan dengan sesi lain.' : 'Sesi belum tersimpan. Periksa koneksi lalu coba lagi.' };
  revalidatePath('/today');
  revalidatePath(`/students/${parsed.data.studentId}`);
  return { sessionId };
}
