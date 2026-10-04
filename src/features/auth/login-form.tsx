"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { loginAction } from "@/features/auth/actions";
import { FormFeedback } from "@/components/form-feedback";
import { initialFormState } from "@/lib/action-state";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialFormState,
  );

  return (
    <form action={formAction} className="auth-fields">
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          autoComplete="email"
          className="input"
          id="email"
          name="email"
          placeholder="nama@email.com"
          required
          type="email"
        />
      </div>
      <div className="field">
        <label htmlFor="password">Kata sandi</label>
        <input
          autoComplete="current-password"
          className="input"
          id="password"
          name="password"
          required
          type="password"
        />
      </div>
      <div className="auth-forgot-row">
        <Link className="inline-link" href="/forgot-password">
          Lupa kata sandi?
        </Link>
      </div>
      <FormFeedback state={state} />
      <button className="button button-full" disabled={isPending} type="submit">
        {isPending ? (
          <LoaderCircle aria-hidden="true" className="spin-icon" size={18} />
        ) : (
          <ArrowRight aria-hidden="true" size={18} />
        )}
        {isPending ? "Memeriksa…" : "Masuk"}
      </button>
    </form>
  );
}
