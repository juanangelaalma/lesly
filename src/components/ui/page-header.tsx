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
    <header className="flex flex-wrap items-start gap-3 pb-6">
      {backHref ? (
        <Link
          href={backHref}
          aria-label="Kembali"
          className="pressable mt-0.5 grid size-11 shrink-0 place-items-center rounded-[var(--radius-inner)] border-2 border-ink bg-surface shadow-clay active:shadow-clay-pressed"
        >
          <ArrowLeftIcon size={20} weight="bold" />
        </Link>
      ) : null}
      <div className="min-w-0 flex-1 basis-40">
        <h1 className="font-display text-2xl leading-tight font-bold">{title}</h1>
        {subtitle ? <div className="mt-1.5 text-sm leading-relaxed text-ink-muted">{subtitle}</div> : null}
      </div>
      {action ? <div className="flex max-w-full shrink-0 flex-wrap gap-2">{action}</div> : null}
    </header>
  );
}
