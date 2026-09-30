"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import type { FormState } from "@/lib/action-result";
import { fromDbError, fromZodError } from "@/lib/errors";
import { str } from "@/lib/form";
import { addDays, localDate } from "@/lib/dates";
import { isoDate } from "@/features/students/schemas";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Pilih jam mulai." });
const duration = z.coerce
  .number({ error: "Isi durasi." })
  .int()
  .min(15, { error: "Minimal 15 menit." })
  .max(480, { error: "Maksimal 8 jam." });

export async function addScheduleRule(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({
      studentId: z.uuid(),
      weekday: z.coerce.number().int().min(1, { error: "Pilih hari." }).max(7),
      startTime: time,
      duration,
      activeFrom: isoDate,
    })
    .safeParse({
      studentId: str(formData, "studentId"),
      weekday: str(formData, "weekday"),
      startTime: str(formData, "startTime"),
      duration: str(formData, "duration"),
      activeFrom: str(formData, "activeFrom"),
    });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_schedule_rule", {
    p_student_id: parsed.data.studentId,
    p_weekday: parsed.data.weekday,
    p_start_time: parsed.data.startTime,
    p_duration_minutes: parsed.data.duration,
    p_active_from: parsed.data.activeFrom,
  });
  if (error) return fromDbError(error);
  const created = (data as { sessionsCreated: number }).sessionsCreated;
  revalidatePath("/", "layout");
  return { ok: true, data: null, message: `Jadwal tersimpan. ${created} sesi dibuat untuk 8 minggu ke depan.` };
}

export async function endScheduleRule(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z.object({ ruleId: z.uuid(), until: isoDate }).safeParse({
    ruleId: str(formData, "ruleId"),
    until: str(formData, "until"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("end_schedule_rule", {
    p_rule_id: parsed.data.ruleId,
    p_until: parsed.data.until,
  });
  if (error) return fromDbError(error);
  revalidatePath("/", "layout");
  return { ok: true, data: null, message: "Jadwal dihentikan. Sesi terjadwal setelahnya dihapus." };
}

/** Materializes recurring sessions for the next 8 weeks. Returns true when new sessions were created. */
export async function syncScheduleWindow(): Promise<boolean> {
  const tutor = await requireUser();
  const today = localDate(new Date(), tutor.tz);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ensure_schedule_window", {
    p_from: addDays(today, -7),
    p_to: addDays(today, 56),
  });
  if (error) {
    console.error("ensure_schedule_window failed", error);
    return false;
  }
  return (data as { sessionsCreated: number }).sessionsCreated > 0;
}
