import "@/components/layout/app-shell.css";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireSignedIn } from "@/lib/auth/require-user";
import { ProfileForm } from "@/features/profile/profile-form";
import { formatPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "Mulai" };

export default async function OnboardingPage() {
  const tutor = await requireSignedIn();
  if (tutor.profile.onboarded_at) redirect("/today");
  return (
    <main className="auth-shell mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-10 sm:px-8">
      <section className="rounded-[var(--radius-card)] border-2 border-line bg-surface p-5 shadow-clay sm:p-7">
      <h1 className="mb-2 font-display text-3xl font-bold">Halo! Kenalan dulu.</h1>
      <p className="mb-3 font-label text-sm font-bold text-ink-muted">Langkah 1 dari 2</p>
      <p className="mb-6 leading-relaxed text-ink-muted">Data ini dipakai di laporan yang Anda kirim ke orang tua murid.</p>
      <ProfileForm
        intent="onboarding"
        defaults={{
          displayName: tutor.profile.display_name,
          phone: tutor.profile.phone ? formatPhone(tutor.profile.phone) : "",
          timezone: tutor.profile.timezone,
          reportSignature: tutor.profile.report_signature ?? "",
        }}
      />
      </section>
    </main>
  );
}
