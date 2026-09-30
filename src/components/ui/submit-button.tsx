"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./button";
import { cn } from "./cn";

type Props = {
  children: ReactNode;
  pendingLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  name?: string;
  value?: string;
};

export function SubmitButton({ children, pendingLabel, variant, size, className, name, value }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      aria-busy={pending}
      className={buttonClass(variant, size, cn("relative", className))}
    >
      <span className={cn("inline-flex items-center gap-2", pending && "opacity-0")}>{children}</span>
      {pending ? (
        <span className="absolute inset-0 flex items-center justify-center gap-2">
          <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
          <span>{pendingLabel ?? "Menyimpan"}</span>
        </span>
      ) : null}
    </button>
  );
}
