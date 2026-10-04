import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/login");
  }

  return { supabase, user: data.user };
}

export async function getTeacherProfile(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teacher_profiles")
    .select("id, display_name, timezone, version")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("Profil guru tidak dapat dimuat.");
  }

  return data;
}
