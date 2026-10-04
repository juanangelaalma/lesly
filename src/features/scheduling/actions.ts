"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { dateInputValueInTimezone, localDateTimeToIso } from "@/lib/dates";
import type { FormState } from "@/lib/action-state";
import {
  createAdhocSessionSchema,
  createScheduleRuleSchema,
  endScheduleRuleSchema,
  nonbillableSessionSchema,
  rescheduleSessionSchema,
} from "@/features/scheduling/schemas";

function value(formData: FormData, name: string) {
  return formData.get(name)?.toString() ?? "";
}

function scheduleError(code?: string) {
  if (code === "23P01") {
    return "Waktu ini bertabrakan dengan sesi lain. Pilih waktu yang berbeda.";
  }

  if (code === "40001") {
    return "Sesi berubah. Muat ulang halaman sebelum mencoba lagi.";
  }

  return "Jadwal belum tersimpan. Periksa isian lalu coba lagi.";
}

function plusDays(date: string, days: number) {
  const value = new Date(date + "T00:00:00Z");
  value.setUTCDate(value.getUTCDate() + days);

  return value.toISOString().slice(0, 10);
}

export async function ensureScheduleWindowAction(
  _previousState: FormState,
  _formData: FormData,
): Promise<FormState> {
  const { supabase, timezone } = await getTeacherTimezone();
  const today = dateInputValueInTimezone(new Date(), timezone);

  const { error } = await supabase.rpc("ensure_schedule_window", {
    p_from: today,
    p_to: plusDays(today, 60),
  });

  if (error) {
    return { status: "error", message: scheduleError(error.code) };
  }

  revalidatePath("/today");

  return { status: "success", message: "Agenda diperbarui." };
}

export async function createScheduleRuleAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = createScheduleRuleSchema.safeParse({
    studentId: value(formData, "studentId"),
    weekday: value(formData, "weekday"),
    localStart: value(formData, "localStart"),
    durationMinutes: value(formData, "durationMinutes"),
    effectiveFrom: value(formData, "effectiveFrom"),
    effectiveUntil: value(formData, "effectiveUntil"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Periksa hari, jam, durasi, dan tanggal.",
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_schedule_rule", {
    p_student_id: parsed.data.studentId,
    p_weekday: parsed.data.weekday,
    p_local_start: parsed.data.localStart,
    p_duration_minutes: parsed.data.durationMinutes,
    p_effective_from: parsed.data.effectiveFrom,
    p_effective_until: parsed.data.effectiveUntil,
  });

  if (error || !data) {
    return { status: "error", message: scheduleError(error?.code) };
  }

  revalidatePath("/today");
  revalidatePath("/students/" + parsed.data.studentId);

  return {
    status: "success",
    message: "Jadwal rutin tersimpan.",
    redirectTo: "/students/" + parsed.data.studentId,
  };
}

export async function endScheduleRuleAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = endScheduleRuleSchema.safeParse({
    ruleId: value(formData, "ruleId"),
    effectiveUntil: value(formData, "effectiveUntil"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Pilih tanggal akhir yang valid." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("end_schedule_rule", {
    p_rule_id: parsed.data.ruleId,
    p_effective_until: parsed.data.effectiveUntil,
  });

  if (error || !data) {
    return { status: "error", message: scheduleError(error?.code) };
  }

  revalidatePath("/today");
  revalidatePath("/students");

  return { status: "success", message: "Jadwal rutin diperbarui." };
}

async function getTeacherTimezone() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teacher_profiles")
    .select("timezone")
    .maybeSingle();

  if (error || !data) throw new Error("Zona waktu guru tidak dapat dimuat.");

  return { supabase, timezone: data.timezone };
}

export async function createAdhocSessionAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = createAdhocSessionSchema.safeParse({
    studentId: value(formData, "studentId"),
    startsAt: value(formData, "startsAt"),
    endsAt: value(formData, "endsAt"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Periksa tanggal dan waktu sesi." };
  }

  try {
    const { supabase, timezone } = await getTeacherTimezone();

    const { data, error } = await supabase.rpc("create_adhoc_session", {
      p_student_id: parsed.data.studentId,
      p_starts_at: localDateTimeToIso(parsed.data.startsAt, timezone),
      p_ends_at: localDateTimeToIso(parsed.data.endsAt, timezone),
    });

    if (error || !data) {
      return { status: "error", message: scheduleError(error?.code) };
    }

    revalidatePath("/today");
    revalidatePath("/students/" + parsed.data.studentId);

    return {
      status: "success",
      message: "Sesi satu kali tersimpan.",
      redirectTo: "/sessions/" + data,
    };
  } catch {
    return { status: "error", message: "Sesi belum tersimpan. Periksa waktu." };
  }
}

export async function rescheduleSessionAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = rescheduleSessionSchema.safeParse({
    sessionId: value(formData, "sessionId"),
    expectedVersion: value(formData, "expectedVersion"),
    startsAt: value(formData, "startsAt"),
    endsAt: value(formData, "endsAt"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Periksa tanggal dan waktu sesi." };
  }

  try {
    const { supabase, timezone } = await getTeacherTimezone();

    const { error } = await supabase.rpc("reschedule_session", {
      p_session_id: parsed.data.sessionId,
      p_expected_version: parsed.data.expectedVersion,
      p_starts_at: localDateTimeToIso(parsed.data.startsAt, timezone),
      p_ends_at: localDateTimeToIso(parsed.data.endsAt, timezone),
    });

    if (error) {
      return { status: "error", message: scheduleError(error.code) };
    }

    revalidatePath("/today");
    revalidatePath("/sessions/" + parsed.data.sessionId);

    return {
      status: "success",
      message: "Waktu sesi diperbarui.",
      redirectTo: "/sessions/" + parsed.data.sessionId,
    };
  } catch {
    return {
      status: "error",
      message: "Sesi belum dipindahkan. Periksa waktu.",
    };
  }
}

export async function setSessionNonbillableAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = nonbillableSessionSchema.safeParse({
    sessionId: value(formData, "sessionId"),
    expectedVersion: value(formData, "expectedVersion"),
    state: value(formData, "state"),
    reason: value(formData, "reason"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Pilih status dan isi alasannya." };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("set_session_nonbillable", {
    p_session_id: parsed.data.sessionId,
    p_expected_version: parsed.data.expectedVersion,
    p_state: parsed.data.state,
    p_reason: parsed.data.reason,
  });

  if (error) {
    return { status: "error", message: scheduleError(error.code) };
  }

  revalidatePath("/today");
  revalidatePath("/sessions/" + parsed.data.sessionId);
  redirect("/today");
}
