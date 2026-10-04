'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export type ProfileState = { error?: string; success?: boolean };

export async function updateProfile(_previous: ProfileState, form: FormData): Promise<ProfileState> {
  const parsed = z.object({ displayName: z.string().trim().min(1, 'Nama tampilan wajib diisi.').max(100), timezone: z.string().min(1) }).safeParse({ displayName: form.get('displayName'), timezone: form.get('timezone') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Periksa kembali profil.' };
  const supabase = await createClient();
  if (!supabase) return { error: 'Aplikasi belum terhubung ke Supabase.' };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesi akun berakhir. Masuk kembali.' };
  const { error } = await supabase.from('teacher_profiles').upsert({ id: user.id, display_name: parsed.data.displayName, timezone: parsed.data.timezone, updated_at: new Date().toISOString() });
  if (error) return { error: 'Profil belum tersimpan. Periksa koneksi lalu coba lagi.' };
  revalidatePath('/settings');
  return { success: true };
}
