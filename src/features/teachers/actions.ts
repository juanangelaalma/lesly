"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { FormState } from "@/lib/action-state";
import { createClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Nama wajib diisi.")
    .max(80, "Nama maksimal 80 karakter."),
  timezone: z.enum([
    "Asia/Jakarta",
    "Asia/Pontianak",
    "Asia/Makassar",
    "Asia/Jayapura",
  ]),
  nextPath: z.enum(["/today", "/settings"]),
});

export async function saveTeacherProfileAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    timezone: formData.get("timezone"),
    nextPath: formData.get("nextPath") ?? "/today",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Periksa kembali profilmu.",
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("save_teacher_profile", {
    p_display_name: parsed.data.displayName,
    p_timezone: parsed.data.timezone,
  });

  if (error) {
    return {
      status: "error",
      message: "Profil belum tersimpan. Periksa koneksi lalu coba lagi.",
    };
  }

  revalidatePath("/today");
  revalidatePath("/settings");
  redirect(parsed.data.nextPath);
}
