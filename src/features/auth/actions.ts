"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { FormState } from "@/lib/action-state";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function loginAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Masukkan email dan kata sandi yang valid.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return {
      status: "error",
      message: "Email atau kata sandi belum cocok. Coba lagi.",
    };
  }

  redirect("/today");
}

const emailSchema = z.object({ email: z.email() });

export async function requestPasswordResetAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { status: "error", message: "Masukkan alamat email yang valid." };
  }

  const supabase = await createClient();
  const appUrl = process.env.APP_URL;

  if (!appUrl) {
    return {
      status: "error",
      message: "Pengaturan alamat aplikasi belum tersedia.",
    };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${appUrl}/auth/confirm?next=/update-password`,
    },
  );

  if (error) {
    return {
      status: "error",
      message: "Email reset belum dapat dikirim. Coba lagi sebentar.",
    };
  }

  return {
    status: "success",
    message:
      "Jika email terdaftar, tautan untuk mengatur ulang kata sandi akan dikirim.",
  };
}

const passwordSchema = z
  .object({
    password: z.string().min(8, "Kata sandi minimal 8 karakter."),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi kata sandi belum sama.",
  });

export async function updatePasswordAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Kata sandi belum valid.",
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      status: "error",
      message:
        "Kata sandi belum dapat diperbarui. Minta tautan baru lalu coba lagi.",
    };
  }

  redirect("/today");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
