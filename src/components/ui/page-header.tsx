import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react/ssr";

export function PageHeader({
  title,
  subtitle,
  backHref,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  backHref?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-start gap-3 pb-4">
      {backHref ? (
        <Link
          href={backHref}
          aria-label="Kembali"
          className="pressable mt-0.5 grid size-10 shrink-0 place-items-center rounded-[var(--radius-inner)] border-2 border-ink bg-surface shadow-clay active:shadow-clay-pressed"
        >
          <ArrowLeftIcon size={20} weight="bold" />
        </Link>
      ) : null}
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-2xl leading-tight font-bold">{title}</h1>
        {subtitle ? <div className="mt-1 text-sm text-ink-muted">{subtitle}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
