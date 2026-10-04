import { Settings2, LogOut } from "lucide-react";
import Link from "next/link";

import { AppNav } from "@/components/app-nav";
import { Brand } from "@/components/brand";
import { signOutAction } from "@/features/auth/actions";

export function AppShell({
  children,
  displayName,
}: Readonly<{ children: React.ReactNode; displayName: string }>) {
  const initial = displayName.trim().slice(0, 1).toLocaleUpperCase("id-ID");

  return (
    <div className="app-shell">
      <aside className="desktop-rail">
        <Brand />
        <AppNav />
        <div className="rail-footer">
          <div className="profile-chip">
            <span className="avatar" aria-hidden="true">
              {initial}
            </span>
            <span className="profile-copy">
              <strong>{displayName}</strong>
              <span>Guru les</span>
            </span>
          </div>
          <Link className="text-action" href="/settings">
            <Settings2 aria-hidden="true" size={17} />
            Profil dan pengaturan
          </Link>
          <form action={signOutAction}>
            <button className="text-action" type="submit">
              <LogOut aria-hidden="true" size={17} />
              Keluar
            </button>
          </form>
        </div>
      </aside>
      <main className="app-main">
        <div className="main-inner">
          <header className="mobile-top-bar">
            <Brand />
            <Link
              className="top-mobile-profile"
              href="/settings"
              aria-label={`Profil ${displayName}`}
            >
              {initial}
            </Link>
          </header>
          {children}
        </div>
      </main>
      <AppNav mobile />
    </div>
  );
}
