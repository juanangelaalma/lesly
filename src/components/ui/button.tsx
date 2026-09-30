import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "gold";
export type ButtonSize = "md" | "sm";

const base =
  "pressable inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] border-2 font-label font-bold whitespace-nowrap select-none disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "border-ink bg-teal text-ink shadow-clay-bold active:shadow-clay-bold-pressed",
  gold: "border-ink bg-gold text-ink shadow-clay-bold active:shadow-clay-bold-pressed",
  secondary: "border-ink bg-surface text-ink shadow-clay active:shadow-clay-pressed",
  danger: "border-danger bg-surface text-danger shadow-clay active:shadow-clay-pressed",
  ghost: "border-transparent bg-transparent text-ink-muted hover:bg-surface-alt",
};

const sizes: Record<ButtonSize, string> = {
  md: "min-h-12 px-5 text-[15px]",
  sm: "min-h-10 px-3.5 text-sm",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize };

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
