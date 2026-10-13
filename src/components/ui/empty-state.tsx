import type { ReactNode } from "react";
import { cn } from "./cn";

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed border-line-control bg-surface-alt/60 px-5 py-10 text-center",
        className,
      )}
    >
      {icon ? <div aria-hidden className="mb-1 grid size-16 place-items-center rounded-[var(--radius-control)] bg-surface text-ink-muted">{icon}</div> : null}
      <div className="flex flex-col gap-1">
        <p className="font-display text-lg font-semibold">{title}</p>
        {description ? <p className="max-w-sm text-sm leading-relaxed text-ink-muted">{description}</p> : null}
      </div>
      {action ? <div className="mt-2 flex max-w-full flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
