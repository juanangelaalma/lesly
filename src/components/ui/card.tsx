import type { ComponentProps } from "react";
import { cn } from "./cn";

type Tone = "surface" | "teal" | "purple" | "gold" | "coral" | "alt";

const tones: Record<Tone, string> = {
  surface: "bg-surface",
  alt: "bg-surface-alt",
  teal: "bg-teal-soft",
  purple: "bg-purple-soft",
  gold: "bg-gold-soft",
  coral: "bg-coral-soft",
};

export function Card({ className, tone = "surface", ...props }: ComponentProps<"div"> & { tone?: Tone }) {
  return (
    <div
      className={cn("rounded-[var(--radius-card)] border-2 border-line p-4 shadow-clay", tones[tone], className)}
      {...props}
    />
  );
}

export function SectionTitle({ className, ...props }: ComponentProps<"h2">) {
  return <h2 className={cn("font-display text-lg font-semibold text-ink", className)} {...props} />;
}
