"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import type { FormState } from "@/lib/action-result";
import { fromDbError, fromZodError } from "@/lib/errors";
import { str } from "@/lib/form";
import { toInstant } from "@/lib/dates";
import { requestKey } from "@/lib/request-key";
import { localDateTime, noteFields } from "./schemas";

const duration = z.coerce.number({ error: "Isi durasi." }).int().min(15, { error: "Minimal 15 menit." }).max(480, { error: "Maksimal 8 jam." });
const version = z.coerce.number().int();

function revalidateSession(id: string) {
  revalidatePath("/today");
  revalidatePath("/schedule");
  revalidatePath(`/sessions/${id}`);
  revalidatePath("/invoices", "layout");
  revalidatePath("/students", "layout");
}

async function instantOrError(date: string, time: string): Promise<string | FormState> {
  const tutor = await requireUser();
  const instant = toInstant(date, time, tutor.tz);
  if (!instant) return { ok: false, code: "VALIDATION", message: "Tanggal atau jam tidak valid." };
  return instant;
}

export async function createSession(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = localDateTime.extend({ studentId: z.uuid({ error: "Pilih murid." }), duration, requestKey }).safeParse({
    studentId: str(formData, "studentId"),
    date: str(formData, "date"),
    time: str(formData, "time"),
    duration: str(formData, "duration"),
    requestKey: str(formData, "requestKey"),
  });
  if (!parsed.success) return fromZodError(parsed.error);
  const startsAt = await instantOrError(parsed.data.date, parsed.data.time);
  if (typeof startsAt !== "string") return startsAt;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_session", {
    p_request_key: parsed.data.requestKey,
    p_student_id: parsed.data.studentId,
    p_starts_at: startsAt,
    p_duration_minutes: parsed.data.duration,
  });
  if (error) return fromDbError(error);
  const sessionId = (data as { sessionId: string }).sessionId;
  revalidateSession(sessionId);
  redirect(`/sessions/${sessionId}`);
}

export async function rescheduleSession(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = localDateTime.extend({ sessionId: z.uuid(), version, duration }).safeParse({
    sessionId: str(formData, "sessionId"),
    version: str(formData, "version"),
    date: str(formData, "date"),
    time: str(formData, "time"),
    duration: str(formData, "duration"),
  });
  if (!parsed.success) return fromZodError(parsed.error);
  const startsAt = await instantOrError(parsed.data.date, parsed.data.time);
  if (typeof startsAt !== "string") return startsAt;

  const supabase = await createClient();
  const { error } = await supabase.rpc("reschedule_session", {
    p_session_id: parsed.data.sessionId,
    p_expected_version: parsed.data.version,
    p_starts_at: startsAt,
    p_duration_minutes: parsed.data.duration,
  });
  if (error) return fromDbError(error);
  revalidateSession(parsed.data.sessionId);
  redirect(`/sessions/${parsed.data.sessionId}`);
}

export async function setSessionStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({
      sessionId: z.uuid(),
      version,
      status: z.enum(["student_absent", "teacher_cancelled"]),
      reason: z.string().max(200, { error: "Maksimal 200 karakter." }),
    })
    .safeParse({
      sessionId: str(formData, "sessionId"),
      version: str(formData, "version"),
      status: str(formData, "status"),
      reason: str(formData, "reason"),
    });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_session_status", {
    p_session_id: parsed.data.sessionId,
    p_expected_version: parsed.data.version,
    p_status: parsed.data.status,
    p_reason: parsed.data.reason,
  });
  if (error) return fromDbError(error);
  revalidateSession(parsed.data.sessionId);
  return { ok: true, data: null, message: "Status sesi diperbarui." };
}

export async function completeSession(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = noteFields
    .extend({
      sessionId: z.uuid(),
      version,
      requestKey,
      adjustTime: z.boolean(),
      date: z.string(),
      time: z.string(),
    })
    .safeParse({
      sessionId: str(formData, "sessionId"),
      version: str(formData, "version"),
      requestKey: str(formData, "requestKey"),
      topic: str(formData, "topic"),
      understanding: str(formData, "understanding"),
      note: str(formData, "note"),
      adjustTime: formData.get("adjustTime") === "on",
      date: str(formData, "date"),
      time: str(formData, "time"),
    });
  if (!parsed.success) return fromZodError(parsed.error);
  const v = parsed.data;

  let actualStart: string | undefined;
  if (v.adjustTime) {
    const instant = await instantOrError(v.date, v.time);
    if (typeof instant !== "string") return instant;
    actualStart = instant;
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_session", {
    p_request_key: v.requestKey,
    p_session_id: v.sessionId,
    p_expected_version: v.version,
    p_topic_name: v.topic,
    p_understanding: v.understanding,
    p_note: v.note,
    p_actual_starts_at: actualStart,
  });
  if (error) return fromDbError(error);
  revalidateSession(v.sessionId);
  redirect(`/sessions/${v.sessionId}/report?done=1`);
}

export async function updateSessionNote(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = noteFields.extend({ sessionId: z.uuid(), version }).safeParse({
    sessionId: str(formData, "sessionId"),
    version: str(formData, "version"),
    topic: str(formData, "topic"),
    understanding: str(formData, "understanding"),
    note: str(formData, "note"),
  });
  if (!parsed.success) return fromZodError(parsed.error);
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_session_note", {
    p_session_id: v.sessionId,
    p_expected_version: v.version,
    p_topic_name: v.topic,
    p_understanding: v.understanding,
    p_note: v.note,
  });
  if (error) return fromDbError(error);
  revalidateSession(v.sessionId);
  redirect(`/sessions/${v.sessionId}`);
}

export async function reopenSession(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({ sessionId: z.uuid(), version, reason: z.string().min(3, { error: "Tulis alasan minimal 3 karakter." }).max(200) })
    .safeParse({ sessionId: str(formData, "sessionId"), version: str(formData, "version"), reason: str(formData, "reason") });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("reopen_session", {
    p_session_id: parsed.data.sessionId,
    p_expected_version: parsed.data.version,
    p_reason: parsed.data.reason,
  });
  if (error) return fromDbError(error);
  revalidateSession(parsed.data.sessionId);
  return { ok: true, data: null, message: "Sesi dikembalikan ke status terjadwal." };
}

const PRODUCT_EVENTS = ["report_whatsapp_opened", "report_copied", "reminder_whatsapp_opened", "reminder_copied"] as const;

export async function logShareEvent(name: (typeof PRODUCT_EVENTS)[number], entityId: string): Promise<void> {
  if (!PRODUCT_EVENTS.includes(name) || !z.uuid().safeParse(entityId).success) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("log_product_event", { p_name: name, p_entity_id: entityId });
  if (error) console.error("log_product_event failed", error);
}
