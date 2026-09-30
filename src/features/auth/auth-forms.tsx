"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, Input } from "@/components/ui/field";
import { FormAlert, fieldErrors } from "@/components/ui/form-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { idle, type FormState } from "@/lib/action-result";
import { requestPasswordReset, signIn, signUp, updatePassword } from "./actions";

export function LoginForm({ next, linkError }: { next?: string; linkError?: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(signIn, idle);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {linkError && state.ok === null ? (
        <p role="alert" className="rounded-[var(--radius-inner)] border-2 border-coral bg-coral-soft px-4 py-3 text-sm">
          Tautan tidak valid atau sudah kedaluwarsa. Silakan coba lagi.
        </p>
      ) : null}
      <FormAlert state={state} />
      <input type="hidden" name="next" value={next ?? "/today"} />
      <Field label="Email" htmlFor="email" errors={fieldErrors(state, "email")}>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required invalid={!!fieldErrors(state, "email")} />
      </Field>
      <Field label="Kata sandi" htmlFor="password" errors={fieldErrors(state, "password")}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required invalid={!!fieldErrors(state, "password")} />
      </Field>
      <SubmitButton pendingLabel="Masuk">Masuk</SubmitButton>
      <div className="flex justify-between gap-4 text-sm">
        <Link href="/forgot-password" className="font-label font-bold underline underline-offset-4">Lupa kata sandi?</Link>
        <Link href="/register" className="font-label font-bold underline underline-offset-4">Buat akun</Link>
      </div>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState<FormState, FormData>(signUp, idle);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormAlert state={state} />
      <Field label="Nama Anda" htmlFor="name" errors={fieldErrors(state, "name")}>
        <Input id="name" name="name" autoComplete="name" required maxLength={80} invalid={!!fieldErrors(state, "name")} />
      </Field>
      <Field label="Email" htmlFor="email" errors={fieldErrors(state, "email")}>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required invalid={!!fieldErrors(state, "email")} />
      </Field>
      <Field label="Kata sandi" htmlFor="password" hint="Minimal 8 karakter." errors={fieldErrors(state, "password")}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} invalid={!!fieldErrors(state, "password")} />
      </Field>
      <SubmitButton pendingLabel="Mendaftar">Daftar</SubmitButton>
      <p className="text-sm">
        Sudah punya akun? <Link href="/login" className="font-label font-bold underline underline-offset-4">Masuk</Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(requestPasswordReset, idle);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormAlert state={state} />
      <Field label="Email akun" htmlFor="email" errors={fieldErrors(state, "email")}>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required invalid={!!fieldErrors(state, "email")} />
      </Field>
      <SubmitButton pendingLabel="Mengirim">Kirim tautan</SubmitButton>
      <Link href="/login" className="text-sm font-label font-bold underline underline-offset-4">Kembali ke halaman masuk</Link>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(updatePassword, idle);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormAlert state={state} />
      <Field label="Kata sandi baru" htmlFor="password" hint="Minimal 8 karakter." errors={fieldErrors(state, "password")}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} invalid={!!fieldErrors(state, "password")} />
      </Field>
      <Field label="Ulangi kata sandi" htmlFor="confirm" errors={fieldErrors(state, "confirm")}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required invalid={!!fieldErrors(state, "confirm")} />
      </Field>
      <SubmitButton>Simpan kata sandi</SubmitButton>
    </form>
  );
}
