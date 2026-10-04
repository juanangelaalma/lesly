import type { Metadata } from "next";
import { LogOut } from "lucide-react";

import { signOutAction } from "@/features/auth/actions";
import { TeacherProfileForm } from "@/features/teachers/profile-form";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Profil dan pengaturan" };

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();

  const { data: profile, error } = await supabase
    .from("teacher_profiles")
    .select("display_name, timezone")
    .eq("id", user.id)
    .single();

  if (error) {
    throw new Error("Profil guru tidak dapat dimuat.");
  }

  return (
    <>
      <div className="page-topline">
        <div>
          <p className="eyebrow">Akun</p>
          <h1>Profil dan pengaturan</h1>
          <p className="page-description">
            Atur nama tampilan dan zona waktu yang dipakai untuk tanggal
            kegiatan.
          </p>
        </div>
      </div>
      <TeacherProfileForm
        displayName={profile.display_name}
        returnTo="/settings"
        timezone={profile.timezone}
      />
      <p className="settings-email">
        Masuk sebagai <strong>{user.email}</strong>
      </p>
      <form action={signOutAction} className="settings-signout">
        <button className="button button-secondary" type="submit">
          <LogOut aria-hidden="true" size={17} /> Keluar dari akun
        </button>
      </form>
    </>
  );
}
