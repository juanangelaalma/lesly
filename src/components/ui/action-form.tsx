"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { idle, type FormState } from "@/lib/action-result";
import { FormAlert } from "./form-alert";
import { SubmitButton } from "./submit-button";
import type { ButtonSize, ButtonVariant } from "./button";
import { cn } from "./cn";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  children?: ReactNode;
  submitLabel: ReactNode;
  pendingLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  submitClassName?: string;
  confirmMessage?: string;
  resetOnSuccess?: boolean;
};

/** Small form bound to a server action; shows the action's message above the fields. */
export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel,
  variant,
  size,
  className,
  submitClassName,
  confirmMessage,
  resetOnSuccess,
}: Props) {
  const [state, formAction] = useActionState<FormState, FormData>(action, idle);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state.ok) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className={cn("flex flex-col gap-3", className)}
      onSubmit={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      <FormAlert state={state} />
      {children}
      <SubmitButton variant={variant} size={size} pendingLabel={pendingLabel} className={submitClassName}>
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
