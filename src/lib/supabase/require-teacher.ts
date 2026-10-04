import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function requireTeacher() {
  const supabase = await createClient();
  if (!supabase) redirect('/login?message=setup');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return { supabase, user };
}
