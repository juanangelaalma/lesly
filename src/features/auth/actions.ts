"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/action-result";
import { fromDbError, fromZodError } from "@/lib/errors";
import { str } from "@/lib/form";
import { normalizePhone } from "@/lib/phone";
import { TIMEZONES } from "@/lib/dates";

const email = z.email({ error: "Masukkan email yang valid." });
const password = z.string().min(8, { error: "Kata sandi minimal 8 karakter." }).max(72);

function safeNext(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/today";
}

async function appOrigin(): Promise<string> {
  const configured = process.env.APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z.object({ email, password: z.string().min(1, { error: "Masukkan kata sandi." }) }).safeParse({
    email: str(formData, "email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { ok: false, code: "UNAUTHENTICATED", message: "Email atau kata sandi salah." };
  }
  redirect(safeNext(str(formData, "next")));
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({ name: z.string().min(1, { error: "Nama wajib diisi." }).max(80), email, password })
    .safeParse({ name: str(formData, "name"), email: str(formData, "email"), password: formData.get("password") });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.name },
      emailRedirectTo: `${await appOrigin()}/auth/confirm?next=/onboarding`,
    },
  });
  if (error) {
    const message = /registered|exists/i.test(error.message)
      ? "Email ini sudah terdaftar. Silakan masuk."
      : "Pendaftaran gagal. Coba lagi.";
    return { ok: false, code: "VALIDATION", message };
  }
  if (!data.session) {
    return { ok: true, data: null, message: "Cek email Anda untuk konfirmasi akun, lalu masuk." };
  }
  redirect("/onboarding");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z.object({ email }).safeParse({ email: str(formData, "email") });
  if (!parsed.success) return fromZodError(parsed.error);
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await appOrigin()}/auth/confirm?next=/update-password`,
  });
  return {
    ok: true,
    data: null,
    message: "Jika email terdaftar, tautan untuk mengatur ulang kata sandi sudah dikirim.",
  };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({ password, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { path: ["confirm"], error: "Kata sandi tidak sama." })
    .safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return fromZodError(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { ok: false, code: "UNAUTHENTICATED", message: "Tautan sudah kedaluwarsa. Minta tautan baru." };
  }
  redirect("/today");
}

const profileSchema = z.object({
  displayName: z.string().min(1, { error: "Nama wajib diisi." }).max(80, { error: "Maksimal 80 karakter." }),
  phone: z.string(),
  timezone: z.enum(Object.keys(TIMEZONES) as [keyof typeof TIMEZONES, ...(keyof typeof TIMEZONES)[]]),
  reportSignature: z.string().max(120, { error: "Maksimal 120 karakter." }),
});

export async function saveProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = profileSchema.safeParse({
    displayName: str(formData, "displayName"),
    phone: str(formData, "phone"),
    timezone: str(formData, "timezone"),
    reportSignature: str(formData, "reportSignature"),
  });
  if (!parsed.success) return fromZodError(parsed.error);
  const phone = parsed.data.phone ? normalizePhone(parsed.data.phone) : "";
  if (phone === null) {
    return { ok: false, code: "VALIDATION", message: "Periksa nomor HP.", fieldErrors: { phone: ["Nomor HP tidak valid."] } };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_teacher_profile", {
    p_display_name: parsed.data.displayName,
    p_phone: phone,
    p_timezone: parsed.data.timezone,
    p_report_signature: parsed.data.reportSignature,
  });
  if (error) return fromDbError(error);

  revalidatePath("/", "layout");
  if (str(formData, "intent") === "onboarding") redirect("/students/new?welcome=1");
  return { ok: true, data: null, message: "Profil tersimpan." };
}
