"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { FormFeedback } from "@/components/form-feedback";
import {
  requestPasswordResetAction,
  updatePasswordAction,
} from "@/features/auth/actions";
import { initialFormState } from "@/lib/action-state";

export function RequestPasswordResetForm() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordResetAction,
    initialFormState,
  );

  return (
    <form action={formAction} className="auth-fields">
      <div className="field">
        <label htmlFor="email">Email akun</label>
        <input
          autoComplete="email"
          className="input"
          id="email"
          name="email"
          required
          type="email"
        />
      </div>
      <FormFeedback state={state} />
      <button className="button button-full" disabled={isPending} type="submit">
        {isPending ? (
          <LoaderCircle aria-hidden="true" className="spin-icon" size={18} />
        ) : (
          <ArrowRight aria-hidden="true" size={18} />
        )}
        {isPending ? "Meminta tautan…" : "Kirim tautan reset"}
      </button>
      <p className="auth-footer">
        <Link href="/login">Kembali ke masuk</Link>
      </p>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, formAction, isPending] = useActionState(
    updatePasswordAction,
    initialFormState,
  );

  return (
    <form action={formAction} className="auth-fields">
      <div className="field">
        <label htmlFor="password">Kata sandi baru</label>
        <input
          autoComplete="new-password"
          className="input"
          id="password"
          minLength={8}
          name="password"
          required
          type="password"
        />
        <p className="field-hint">Gunakan sedikitnya 8 karakter.</p>
      </div>
      <div className="field">
        <label htmlFor="confirmPassword">Ulangi kata sandi</label>
        <input
          autoComplete="new-password"
          className="input"
          id="confirmPassword"
          minLength={8}
          name="confirmPassword"
          required
          type="password"
        />
      </div>
      <FormFeedback state={state} />
      <button className="button button-full" disabled={isPending} type="submit">
        {isPending ? (
          <LoaderCircle aria-hidden="true" className="spin-icon" size={18} />
        ) : (
          <ArrowRight aria-hidden="true" size={18} />
        )}
        {isPending ? "Menyimpan…" : "Simpan kata sandi"}
      </button>
    </form>
  );
}
