import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("teacher_profiles")
    .select("display_name")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error("Profil guru tidak dapat dimuat.");
  }

  if (!profile?.display_name) {
    redirect("/onboarding");
  }

  return <AppShell displayName={profile.display_name}>{children}</AppShell>;
}
