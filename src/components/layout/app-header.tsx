import Link from "next/link";
import { GearSixIcon } from "@phosphor-icons/react/ssr";

export function AppHeader({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "G";
  return (
    <header className="border-b border-line bg-surface/60">
    <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:max-w-3xl">
      <Link href="/today" className="flex items-center gap-2 font-display text-xl font-bold">
        <span aria-hidden className="grid size-9 place-items-center rounded-[var(--radius-inner)] border-2 border-ink bg-gold shadow-clay-bold-pressed font-display">
          {initial}
        </span>
        <span className="lg:hidden">Teman Les</span>
        <span className="hidden max-w-sm truncate font-label text-sm font-bold lg:block">{name}</span>
      </Link>
      <Link
        href="/settings"
        aria-label="Pengaturan"
        className="pressable grid size-11 place-items-center rounded-[var(--radius-inner)] border-2 border-ink bg-surface shadow-clay active:shadow-clay-pressed"
      >
        <GearSixIcon size={22} weight="bold" aria-hidden />
      </Link>
    </div>
    </header>
  );
}
