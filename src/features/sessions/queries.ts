import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const SESSION_SELECT =
  "id, student_id, starts_at, duration_minutes, status, status_reason, rescheduled, version, rule_id, students(id, name, grade, subject, address, guardian_name, guardian_phone, status), session_notes(understanding, note, updated_at, learning_topics(name))";

export async function getSession(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sessions").select(SESSION_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data || !data.students) notFound();
  return { ...data, student: data.students, note: data.session_notes };
}

export async function listSessionsBetween(fromIso: string, toIso: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("id, starts_at, duration_minutes, status, rescheduled, students(id, name, grade, subject, address)")
    .gte("starts_at", fromIso)
    .lt("starts_at", toIso)
    .order("starts_at");
  if (error) throw error;
  return data;
}

/** Most recent completed-session note for each of the given students. */
export async function latestNotes(studentIds: string[]) {
  const supabase = await createClient();
  const rows = await Promise.all(
    studentIds.map(async (studentId) => {
      const { data, error } = await supabase
        .from("sessions")
        .select("student_id, starts_at, session_notes!inner(understanding, learning_topics(name))")
        .eq("student_id", studentId)
        .eq("status", "completed")
        .order("starts_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    }),
  );
  const result = new Map<string, { topic: string; understanding: string; startsAt: string }>();
  for (const row of rows) {
    if (!row?.session_notes) continue;
    result.set(row.student_id, {
      topic: row.session_notes.learning_topics?.name ?? "",
      understanding: row.session_notes.understanding,
      startsAt: row.starts_at,
    });
  }
  return result;
}

export async function lastShareEvent(entityId: string, names: string[]) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_events")
    .select("name, created_at")
    .eq("entity_id", entityId)
    .in("name", names)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getSessionAudit(entityId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_events")
    .select("id, action, reason, created_at")
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data;
}
