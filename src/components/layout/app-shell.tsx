'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const items = [
  { href: '/today', label: 'Hari ini', mark: '◷' },
  { href: '/students', label: 'Murid', mark: '○' },
  { href: '/invoices', label: 'Tagihan', mark: '▤' },
];

export default function AppShell({ children, name }: Readonly<{ children: React.ReactNode; name: string }>) {
  const pathname = usePathname();
  async function signOut() {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    window.location.assign('/login');
  }
  return <div className="shell">
    <aside className="sidebar">
      <Link className="brand brand-name" href="/today">teman les</Link>
      <nav className="nav-group" aria-label="Navigasi utama">{items.map(item => <Link key={item.href} className="nav-link" href={item.href} aria-current={pathname.startsWith(item.href) ? 'page' : undefined}><span className="nav-glyph" aria-hidden="true">{item.mark}</span>{item.label}</Link>)}</nav>
      <div className="sidebar-foot"><Link className="nav-link" href="/settings"><span className="nav-glyph" aria-hidden="true">⚙</span>Profil dan pengaturan</Link><button className="button button-quiet" style={{ justifyContent: 'flex-start', minHeight: 44, width: '100%', marginTop: 8 }} onClick={signOut}>Keluar dari akun</button></div>
    </aside>
    <main className="main"><div className="mobile-head"><Link className="brand brand-name" href="/today">teman les</Link><Link className="user-mark" href="/settings" aria-label={`Profil ${name}`}>{name.slice(0, 1).toLocaleUpperCase('id-ID')}</Link></div><div className="content">{children}</div></main>
    <nav className="bottom-nav" aria-label="Navigasi utama">{items.map(item => <Link key={item.href} href={item.href} aria-current={pathname.startsWith(item.href) ? 'page' : undefined}><span className="nav-glyph" aria-hidden="true">{item.mark}</span>{item.label}</Link>)}</nav>
  </div>;
}
