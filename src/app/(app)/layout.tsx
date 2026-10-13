import "@/components/layout/app-shell.css";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { requireUser } from "@/lib/auth/require-user";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const tutor = await requireUser();
  return (
    <div className="app-shell min-h-dvh pb-28">
      <a href="#main-content" className="sr-only fixed top-4 left-4 z-50 rounded-[var(--radius-inner)] border-2 border-ink bg-surface px-4 py-3 font-label font-bold focus:not-sr-only">Lewati ke konten</a>
      <AppHeader name={tutor.profile.display_name} />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-xl px-4 pt-4 sm:px-6 lg:max-w-3xl lg:pt-8">{children}</main>
      <BottomNav />
    </div>
  );
}
