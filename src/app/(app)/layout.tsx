import AppShell from '@/components/layout/app-shell';
import { requireTeacher } from '@/lib/supabase/require-teacher';

export default async function PrivateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { supabase, user } = await requireTeacher();
  const { data } = await supabase.from('teacher_profiles').select('display_name').eq('id', user.id).maybeSingle();
  return <AppShell name={data?.display_name || user.email?.split('@')[0] || 'Guru'}>{children}</AppShell>;
}
