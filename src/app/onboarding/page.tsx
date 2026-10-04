import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";

import { signOutAction } from "@/features/auth/actions";
import { TeacherProfileForm } from "@/features/teachers/profile-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Lengkapi profil" };

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("teacher_profiles")
    .select("display_name, timezone")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error("Profil guru tidak dapat dimuat.");
  }

  if (profile?.display_name) {
    redirect("/today");
  }

  return (
    <main className="setup-page">
      <div className="setup-inner">
        <p className="eyebrow">Langkah 1 dari 2</p>
        <h1>Mulai dari profilmu</h1>
        <p className="page-description">
          Nama ini hanya terlihat di ruang kerjamu. Setelah itu, kamu bisa
          menambahkan murid pertama.
        </p>
        <div className="setup-spacer" />
        <TeacherProfileForm
          displayName={profile?.display_name ?? ""}
          timezone={profile?.timezone ?? "Asia/Jakarta"}
          submitLabel="Lanjutkan"
        />
        <form action={signOutAction} className="onboarding-signout">
          <button className="text-action" type="submit">
            <LogOut aria-hidden="true" size={17} /> Keluar
          </button>
        </form>
      </div>
    </main>
  );
}
