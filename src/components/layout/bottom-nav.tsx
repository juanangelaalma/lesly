"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDotsIcon, HouseIcon, ReceiptIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { cn } from "@/components/ui/cn";

const ITEMS = [
  { href: "/today", label: "Hari ini", icon: HouseIcon },
  { href: "/schedule", label: "Jadwal", icon: CalendarDotsIcon },
  { href: "/students", label: "Murid", icon: UsersThreeIcon },
  { href: "/invoices", label: "Tagihan", icon: ReceiptIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigasi utama"
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t-2 border-line bg-canvas/95 backdrop-blur-sm"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-4 gap-1 px-2 pt-2">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "pressable flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-inner)] border-2 font-label text-xs font-bold",
                  active ? "border-ink bg-teal shadow-clay-bold-pressed" : "border-transparent text-ink-muted hover:bg-surface-alt",
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
