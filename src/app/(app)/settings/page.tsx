import type { Metadata } from "next";
import { DownloadSimpleIcon, SignOutIcon } from "@phosphor-icons/react/ssr";
import { PageHeader } from "@/components/ui/page-header";
import { Card, SectionTitle } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { ProfileForm } from "@/features/profile/profile-form";
import { signOut } from "@/features/auth/actions";
import { requireUser } from "@/lib/auth/require-user";
import { formatPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "Pengaturan" };

export default async function SettingsPage() {
  const tutor = await requireUser();
  return (
    <>
      <PageHeader title="Pengaturan" subtitle={tutor.email} backHref="/today" />
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4">
          <SectionTitle>Profil</SectionTitle>
          <ProfileForm
            intent="settings"
            defaults={{
              displayName: tutor.profile.display_name,
              phone: tutor.profile.phone ? formatPhone(tutor.profile.phone) : "",
              timezone: tutor.profile.timezone,
              reportSignature: tutor.profile.report_signature ?? "",
            }}
          />
        </Card>
        <Card className="flex flex-col gap-3">
          <SectionTitle>Data Anda</SectionTitle>
          <p className="text-sm text-ink-muted">Unduh data murid, sesi, catatan, tagihan, dan pembayaran sebagai file CSV.</p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["students", "Murid"],
                ["sessions", "Sesi & catatan"],
                ["invoices", "Tagihan"],
                ["payments", "Pembayaran"],
              ] as const
            ).map(([kind, label]) => (
              <a key={kind} href={`/api/exports/${kind}`} download className={buttonClass("secondary", "sm")}>
                <DownloadSimpleIcon size={18} weight="bold" aria-hidden /> {label}
              </a>
            ))}
          </div>
        </Card>
        <form action={signOut}>
          <SubmitButton variant="ghost" className="w-full">
            <SignOutIcon size={20} weight="bold" aria-hidden /> Keluar
          </SubmitButton>
        </form>
      </div>
    </>
  );
}
