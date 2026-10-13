import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "gold";
export type ButtonSize = "md" | "sm";

const base =
  "pressable inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] border-2 font-label font-bold whitespace-nowrap select-none disabled:cursor-not-allowed disabled:bg-surface-alt disabled:bg-none disabled:shadow-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "clay-teal border-ink bg-teal text-ink shadow-clay-bold enabled:active:shadow-clay-bold-pressed",
  gold: "clay-gold border-ink bg-gold text-ink shadow-clay-bold enabled:active:shadow-clay-bold-pressed",
  secondary: "clay-raised border-ink bg-surface text-ink shadow-clay enabled:active:shadow-clay-pressed",
  danger: "clay-raised border-danger bg-surface text-danger shadow-clay enabled:active:shadow-clay-pressed",
  ghost: "border-transparent bg-transparent text-ink-muted hover:bg-surface-alt",
};

const sizes: Record<ButtonSize, string> = {
  md: "min-h-12 px-5 text-[15px]",
  sm: "min-h-10 px-3.5 text-sm",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize; static?: boolean };

export function Button({ variant, size, static: isStatic, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} data-static={isStatic || undefined} className={buttonClass(variant, size, className)} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize; static?: boolean };

export function ButtonLink({ variant = "primary", size, static: isStatic, className, ...props }: ButtonLinkProps) {
  const pressedShadow = variant === "primary" || variant === "gold"
    ? "active:shadow-clay-bold-pressed"
    : variant === "ghost" ? undefined : "active:shadow-clay-pressed";
  return (
    <Link
      data-static={isStatic || undefined}
      className={cn(buttonClass(variant, size), pressedShadow, className)}
      {...props}
    />
  );
}
