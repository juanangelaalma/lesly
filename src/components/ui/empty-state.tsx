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
        "flex flex-col items-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed border-line-control bg-surface-alt/60 px-6 py-8 text-center",
        className,
      )}
    >
      {icon ? <div className="text-ink-muted">{icon}</div> : null}
      <div className="flex flex-col gap-1">
        <p className="font-display text-lg font-semibold">{title}</p>
        {description ? <p className="max-w-xs text-sm text-ink-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
