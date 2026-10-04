'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import sharp from 'sharp';
import { createClient } from '@/lib/supabase/server';

export type PhotoActionState = { error?: string; success?: string };

const actionSchema = z.object({ sessionId: z.string().uuid() });
const allowedFormats: Record<string, string> = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export async function uploadSessionPhoto(_previous: PhotoActionState, form: FormData): Promise<PhotoActionState> {
  const parsed = actionSchema.safeParse({ sessionId: form.get('sessionId') });
  if (!parsed.success) return { error: 'Sesi foto tidak valid.' };
  const file = form.get('photo');
  if (!(file instanceof File) || file.size < 1 || file.size > 5 * 1024 * 1024) return { error: 'Pilih satu foto berukuran maksimal 5 MB.' };
  const supabase = await createClient();
  if (!supabase) return { error: 'Aplikasi belum terhubung ke Supabase. Catatan sesi tetap tersimpan.' };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesi akun berakhir. Masuk kembali.' };
  const { data: session } = await supabase.from('sessions').select('id,state,student_id,students(photo_consent_at)').eq('id', parsed.data.sessionId).maybeSingle();
  const student = Array.isArray(session?.students) ? session.students[0] : session?.students;
  if (!session || session.state !== 'completed') return { error: 'Foto hanya dapat ditambahkan pada sesi yang sudah dicatat.' };
  if (!student?.photo_consent_at) return { error: 'Catat izin orang tua terlebih dahulu di detail murid.' };

  let output: Buffer;
  try {
    const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 20_000_000, failOn: 'error' });
    const metadata = await image.metadata();
    if (!metadata.format || allowedFormats[metadata.format] !== file.type) return { error: 'Pilih foto JPEG, PNG, atau WebP yang sesuai dengan isi berkas. HEIC belum didukung.' };
    if (!metadata.width || !metadata.height || metadata.width * metadata.height > 20_000_000) return { error: 'Ukuran gambar terlalu besar untuk diproses dengan aman.' };
    output = await image.rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  } catch {
    return { error: 'Foto tidak dapat dibaca. Pilih berkas JPEG, PNG, atau WebP yang valid.' };
  }
  if (output.byteLength > 5 * 1024 * 1024) return { error: 'Foto hasil kompresi masih terlalu besar. Pilih gambar yang lebih kecil.' };
  const { data: reserved, error: reserveError } = await supabase.rpc('reserve_session_media', { p_session_id: parsed.data.sessionId, p_byte_size: output.byteLength });
  if (reserveError || !reserved?.[0]) return { error: reserveError?.message.includes('PHOTO_CONSENT_REQUIRED') ? 'Izin foto sudah tidak aktif. Periksa kembali persetujuan orang tua.' : 'Foto belum dapat disiapkan. Sesi mungkin sudah memiliki foto.' };
  const { media_id: mediaId, object_path: objectPath } = reserved[0];
  const bucket = supabase.storage.from('session-photos');
  const { error: uploadError } = await bucket.upload(objectPath, output, { contentType: 'image/jpeg', upsert: false, cacheControl: '60' });
  if (uploadError) {
    const { data: objectPath } = await supabase.rpc('remove_session_media', { p_media_id: mediaId });
    if (objectPath) {
      const { error } = await bucket.remove([objectPath]);
      if (!error) await supabase.rpc('purge_session_media', { p_media_id: mediaId });
    }
    revalidatePath(`/sessions/${parsed.data.sessionId}`);
    return { error: 'Foto belum tersimpan. Catatan sesi tidak berubah; coba lagi.' };
  }
  const { error: finalizeError } = await supabase.rpc('finalize_session_media', { p_media_id: mediaId });
  if (finalizeError) {
    const { data: path } = await supabase.rpc('remove_session_media', { p_media_id: mediaId });
    const cleanupPath = path || objectPath;
    const { error } = await bucket.remove([cleanupPath]);
    if (!error) await supabase.rpc('purge_session_media', { p_media_id: mediaId });
    revalidatePath(`/sessions/${parsed.data.sessionId}`);
    return { error: 'Izin foto berubah saat unggahan berlangsung. Foto dihapus dan catatan sesi tetap tersimpan.' };
  }
  revalidatePath(`/sessions/${parsed.data.sessionId}`);
  revalidatePath(`/students/${session.student_id}`);
  return { success: 'Foto latihan tersimpan secara privat.' };
}

export async function removeSessionPhoto(_previous: PhotoActionState, form: FormData): Promise<PhotoActionState> {
  const parsed = z.object({ mediaId: z.string().uuid(), sessionId: z.string().uuid() }).safeParse({ mediaId: form.get('mediaId'), sessionId: form.get('sessionId') });
  if (!parsed.success) return { error: 'Foto tidak valid.' };
  const supabase = await createClient();
  if (!supabase) return { error: 'Aplikasi belum terhubung ke Supabase.' };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesi akun berakhir. Masuk kembali.' };
  const { data: objectPath, error: removeError } = await supabase.rpc('remove_session_media', { p_media_id: parsed.data.mediaId });
  if (removeError || !objectPath) return { error: 'Foto tidak ditemukan atau tidak dapat dihapus.' };
  const { error: storageError } = await supabase.storage.from('session-photos').remove([objectPath]);
  if (storageError) {
    revalidatePath(`/sessions/${parsed.data.sessionId}`);
    return { error: 'Foto disembunyikan dan izinnya tetap privat, tetapi penghapusan berkas belum selesai. Coba lagi.' };
  }
  await supabase.rpc('purge_session_media', { p_media_id: parsed.data.mediaId });
  revalidatePath(`/sessions/${parsed.data.sessionId}`);
  return { success: 'Foto dihapus.' };
}

export async function recordPhotoConsent(_previous: PhotoActionState, form: FormData): Promise<PhotoActionState> {
  const parsed = z.object({ studentId: z.string().uuid(), consentDate: z.string().date(), confirmed: z.literal('on') }).safeParse({ studentId: form.get('studentId'), consentDate: form.get('consentDate'), confirmed: form.get('confirmed') });
  if (!parsed.success) return { error: 'Catat tanggal izin orang tua terlebih dahulu.' };
  const supabase = await createClient();
  if (!supabase) return { error: 'Aplikasi belum terhubung ke Supabase.' };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesi akun berakhir. Masuk kembali.' };
  const { error } = await supabase.rpc('set_student_photo_consent', { p_student_id: parsed.data.studentId, p_consent_date: parsed.data.consentDate });
  if (error) return { error: 'Izin belum dicatat. Pastikan tanggalnya bukan tanggal mendatang dan murid masih aktif.' };
  revalidatePath(`/students/${parsed.data.studentId}`);
  return { success: 'Izin menyimpan foto hasil latihan telah dicatat.' };
}

export async function withdrawPhotoConsent(_previous: PhotoActionState, form: FormData): Promise<PhotoActionState> {
  const parsed = z.object({ studentId: z.string().uuid() }).safeParse({ studentId: form.get('studentId') });
  if (!parsed.success) return { error: 'Data murid tidak valid.' };
  const supabase = await createClient();
  if (!supabase) return { error: 'Aplikasi belum terhubung ke Supabase.' };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesi akun berakhir. Masuk kembali.' };
  const { data: media, error } = await supabase.rpc('withdraw_student_photo_consent', { p_student_id: parsed.data.studentId });
  if (error) return { error: 'Izin belum dapat ditarik. Coba lagi.' };
  const mediaItems = media || [];
  const { error: storageError } = mediaItems.length ? await supabase.storage.from('session-photos').remove(mediaItems.map((item: { object_path: string }) => item.object_path)) : { error: null };
  if (!storageError) {
    for (const item of mediaItems) await supabase.rpc('purge_session_media', { p_media_id: item.media_id });
  }
  revalidatePath(`/students/${parsed.data.studentId}`);
  revalidatePath('/sessions');
  if (storageError) return { error: 'Izin sudah ditarik dan foto tidak lagi terlihat. Penghapusan berkas belum selesai; tekan lagi untuk mencoba ulang.' };
  return { success: 'Izin ditarik dan foto terkait dihapus.' };
}
