"use client";

import { CalendarDays, CircleDollarSign, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const destinations = [
  { href: "/today", label: "Hari ini", icon: CalendarDays },
  { href: "/students", label: "Murid", icon: UsersRound },
  { href: "/invoices", label: "Tagihan", icon: CircleDollarSign },
];

export function AppNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const className = mobile ? "mobile-bottom-nav" : "rail-nav";

  return (
    <nav className={className} aria-label="Navigasi utama">
      {destinations.map(({ href, label, icon: Icon }) => {
        const selected =
          pathname === href ||
          (href !== "/today" && pathname.startsWith(`${href}/`));

        return (
          <Link
            aria-current={selected ? "page" : undefined}
            className="nav-link"
            href={href}
            key={href}
          >
            <Icon
              aria-hidden="true"
              size={20}
              strokeWidth={selected ? 2 : 1.7}
            />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
