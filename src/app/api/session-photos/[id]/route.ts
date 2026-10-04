import { createClient } from '@/lib/supabase/server';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return Response.json({ error: 'Aplikasi belum terhubung ke Supabase.' }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Sesi akun berakhir.' }, { status: 401 });
  const { data: media, error } = await supabase.from('session_media').select('object_path').eq('id', id).eq('state', 'ready').maybeSingle();
  if (error) return Response.json({ error: 'Foto belum dapat dimuat.' }, { status: 503 });
  if (!media) return Response.json({ error: 'Foto tidak ditemukan.' }, { status: 404 });
  const { data: photo, error: downloadError } = await supabase.storage.from('session-photos').download(media.object_path);
  if (downloadError || !photo) return Response.json({ error: 'Foto belum dapat diunduh.' }, { status: 503 });
  return new Response(photo, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Disposition': 'attachment; filename="foto-latihan.jpg"',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
