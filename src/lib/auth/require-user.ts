import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { asTimeZone, type TimeZone } from "@/lib/dates";
import type { Tables } from "@/types/database";

export type Tutor = {
  id: string;
  email: string;
  profile: Tables<"teacher_profiles">;
  tz: TimeZone;
};

/** Validates the session with Supabase Auth and loads the tutor profile once per request. */
const loadTutor = cache(async (): Promise<Tutor | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;

  const { data: profile } = await supabase
    .from("teacher_profiles")
    .select("*")
    .eq("id", claims.sub)
    .maybeSingle();
  if (!profile) return null;

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    profile,
    tz: asTimeZone(profile.timezone),
  };
});

export async function requireUser(): Promise<Tutor> {
  const tutor = await loadTutor();
  if (!tutor) redirect("/login");
  if (!tutor.profile.onboarded_at) redirect("/onboarding");
  return tutor;
}

export async function requireSignedIn(): Promise<Tutor> {
  const tutor = await loadTutor();
  if (!tutor) redirect("/login");
  return tutor;
}
