import type { FormState } from "@/lib/action-result";
import { cn } from "./cn";

export function FormAlert({ state, className }: { state: FormState<unknown>; className?: string }) {
  if (state.ok === null) return null;
  if (state.ok) {
    if (!state.message) return null;
    return (
      <p role="status" className={cn("rounded-[var(--radius-inner)] border-2 border-teal-deep/40 bg-teal-soft px-4 py-3 text-sm", className)}>
        {state.message}
      </p>
    );
  }
  return (
    <p role="alert" className={cn("rounded-[var(--radius-inner)] border-2 border-coral bg-coral-soft px-4 py-3 text-sm text-ink", className)}>
      {state.message}
    </p>
  );
}

export function fieldErrors(state: FormState<unknown>, name: string): string[] | undefined {
  return state.ok === false ? state.fieldErrors?.[name] : undefined;
}
