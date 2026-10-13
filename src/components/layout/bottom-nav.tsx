"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDotsIcon, GearSixIcon, HouseIcon, ReceiptIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { cn } from "@/components/ui/cn";

const ITEMS = [
  { href: "/today", label: "Hari ini", icon: HouseIcon },
  { href: "/schedule", label: "Jadwal", icon: CalendarDotsIcon },
  { href: "/students", label: "Murid", icon: UsersThreeIcon },
  { href: "/invoices", label: "Tagihan", icon: ReceiptIcon },
  { href: "/settings", label: "Pengaturan", icon: GearSixIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigasi utama"
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t-2 border-line bg-canvas lg:inset-y-0 lg:right-auto lg:flex lg:w-60 lg:flex-col lg:border-t-0 lg:border-r-2 lg:bg-surface lg:p-5"
    >
      <Link href="/today" className="mb-10 hidden items-center gap-3 font-display text-xl font-bold lg:flex">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-inner)] border-2 border-ink bg-gold shadow-clay-bold-pressed">T</span>
        Teman Les
      </Link>
      <ul className="mx-auto grid w-full max-w-xl grid-cols-4 gap-1 px-2 pt-2 lg:flex lg:flex-col lg:gap-2 lg:p-0">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className={href === "/settings" ? "hidden lg:mt-6 lg:block" : undefined}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-inner)] border-2 font-label text-xs font-bold lg:min-h-12 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-sm",
                  active ? "border-ink bg-teal text-ink shadow-clay-bold-pressed" : "border-transparent text-ink-muted hover:bg-surface-alt",
                )}
              >
                <Icon size={22} weight={active ? "fill" : "bold"} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
