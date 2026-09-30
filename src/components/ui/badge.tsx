import type { ReactNode } from "react";
import { cn } from "./cn";

export type BadgeTone = "teal" | "purple" | "gold" | "coral" | "neutral";

const tones: Record<BadgeTone, string> = {
  teal: "bg-teal-soft border-teal-deep/40",
  purple: "bg-purple-soft border-purple/50",
  gold: "bg-gold-soft border-gold",
  coral: "bg-coral-soft border-coral/70",
  neutral: "bg-surface-alt border-line",
};

export function Badge({ tone = "neutral", children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border-[1.5px] px-2.5 py-0.5 font-label text-xs font-bold whitespace-nowrap text-ink",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
