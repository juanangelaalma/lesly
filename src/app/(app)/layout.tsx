import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { requireUser } from "@/lib/auth/require-user";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const tutor = await requireUser();
  return (
    <div className="min-h-dvh pb-28">
      <AppHeader name={tutor.profile.display_name} />
      <main className="mx-auto max-w-xl px-4 pt-2">{children}</main>
      <BottomNav />
    </div>
  );
}
