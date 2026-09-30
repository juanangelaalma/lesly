import type { ReactNode } from "react";
import { CaretDownIcon } from "@phosphor-icons/react/ssr";
import { cn } from "./cn";

/** Native <details> styled as a clay control; works without JavaScript. */
export function Disclosure({
  summary,
  children,
  className,
  defaultOpen,
}: {
  summary: ReactNode;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className={cn("group rounded-[var(--radius-control)] border-2 border-line bg-surface-alt/60", className)}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 font-label text-[15px] font-bold [&::-webkit-details-marker]:hidden">
        {summary}
        <CaretDownIcon size={18} weight="bold" aria-hidden className="transition-transform duration-150 group-open:rotate-180" />
      </summary>
      <div className="px-4 pt-1 pb-4">{children}</div>
    </details>
  );
}
