import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function listStudents(status: "active" | "archived", search: string) {
  const supabase = await createClient();
  let query = supabase
    .from("students")
    .select("id, name, grade, subject, guardian_name, status, billing_plans(mode, amount, effective_from)")
    .eq("status", status)
    .order("name");
  if (search) query = query.ilike("name", `%${search.replace(/[%_\\]/g, (c) => `\\${c}`)}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getStudent(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("students").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  return data;
}

export async function getStudentPlans(studentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("billing_plans")
    .select("id, mode, amount, effective_from")
    .eq("student_id", studentId)
    .order("effective_from", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getScheduleRules(studentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schedule_rules")
    .select("id, weekday, start_time, duration_minutes, active_from, active_until")
    .eq("student_id", studentId)
    .order("weekday")
    .order("start_time");
  if (error) throw error;
  return data;
}

export const HISTORY_PAGE_SIZE = 10;

/** Learning history, newest first, using a starts_at cursor. */
export async function getLearningHistory(studentId: string, before?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("sessions")
    .select("id, starts_at, status, status_reason, session_notes(understanding, note, learning_topics(name))")
    .eq("student_id", studentId)
    .neq("status", "scheduled")
    .order("starts_at", { ascending: false })
    .limit(HISTORY_PAGE_SIZE + 1);
  if (before) query = query.lt("starts_at", before);
  const { data, error } = await query;
  if (error) throw error;
  const hasMore = data.length > HISTORY_PAGE_SIZE;
  const items = data.slice(0, HISTORY_PAGE_SIZE);
  return { items, nextCursor: hasMore ? items[items.length - 1].starts_at : null };
}

export async function getStudentInvoices(studentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoice_balances")
    .select("id, period, total, paid, balance, status")
    .eq("student_id", studentId)
    .order("period", { ascending: false })
    .limit(6);
  if (error) throw error;
  return data;
}

export async function getUpcomingSessions(studentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("id, starts_at, duration_minutes, rescheduled")
    .eq("student_id", studentId)
    .eq("status", "scheduled")
    .gte("starts_at", new Date(Date.now() - 12 * 3600_000).toISOString())
    .order("starts_at")
    .limit(5);
  if (error) throw error;
  return data;
}
