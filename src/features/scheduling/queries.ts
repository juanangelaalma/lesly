import { indonesiaDayUtcBounds } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export async function getTeacherProfile() {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("teacher_profiles")
    .select("display_name, timezone")
    .maybeSingle();

  if (error || !profile) throw new Error("Profil guru tidak dapat dimuat.");

  return profile;
}

export async function getAgendaForDay(date: string) {
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("teacher_profiles")
    .select("display_name, timezone")
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error("Profil guru tidak dapat dimuat.");
  }

  const bounds = indonesiaDayUtcBounds(date, profile.timezone);

  const { data: sessions, error } = await supabase
    .from("sessions")
    .select(
      "id, student_id, starts_at, ends_at, state, version, schedule_rule_id, manually_rescheduled",
    )
    .gte("starts_at", bounds.start)
    .lt("starts_at", bounds.end)
    .order("starts_at");

  if (error) {
    throw new Error("Agenda hari ini tidak dapat dimuat.");
  }

  if (sessions.length === 0) {
    return { profile, sessions: [] };
  }

  const studentIds = [
    ...new Set(sessions.map((session) => session.student_id)),
  ];

  const sessionIds = sessions.map((session) => session.id);

  const [
    { data: students, error: studentsError },
    { data: notes, error: notesError },
  ] = await Promise.all([
    supabase
      .from("students")
      .select("id, name, address_hint")
      .in("id", studentIds),
    supabase
      .from("session_notes")
      .select("id, session_id, topic_id, understanding, note, version")
      .in("session_id", sessionIds),
  ]);

  if (studentsError || notesError) {
    throw new Error("Rincian agenda tidak dapat dimuat.");
  }

  const topicIds = [...new Set(notes.map((note) => note.topic_id))];

  const { data: topics, error: topicsError } =
    topicIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("learning_topics")
          .select("id, name")
          .in("id", topicIds);

  if (topicsError) throw new Error("Materi sesi tidak dapat dimuat.");

  return {
    profile,
    sessions: sessions.map((session) => ({
      ...session,
      student:
        students.find((student) => student.id === session.student_id) ?? null,
      note: notes.find((note) => note.session_id === session.id) ?? null,
      topic:
        topics.find(
          (topic) =>
            topic.id ===
            notes.find((note) => note.session_id === session.id)?.topic_id,
        ) ?? null,
    })),
  };
}

export async function getSessionDetail(sessionId: string) {
  const supabase = await createClient();

  const { data: session, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) throw new Error("Informasi sesi tidak dapat dimuat.");

  if (!session) return null;

  const [
    { data: student, error: studentError },
    { data: note, error: noteError },
    { data: profile, error: profileError },
  ] = await Promise.all([
    supabase
      .from("students")
      .select(
        "id, name, guardian_name, guardian_phone_e164, address_hint, archived_at",
      )
      .eq("id", session.student_id)
      .maybeSingle(),
    supabase
      .from("session_notes")
      .select("*")
      .eq("session_id", session.id)
      .maybeSingle(),
    supabase
      .from("teacher_profiles")
      .select("display_name, timezone")
      .maybeSingle(),
  ]);

  if (studentError || noteError || profileError || !student || !profile) {
    throw new Error("Detail sesi tidak dapat dimuat.");
  }

  const [
    { data: topic, error: topicError },
    { data: previousNotes, error: historyError },
  ] = await Promise.all([
    note
      ? supabase
          .from("learning_topics")
          .select("id, name")
          .eq("id", note.topic_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("session_notes")
      .select("id, session_id, topic_id, understanding, note, updated_at")
      .eq("student_id", student.id)
      .order("updated_at", { ascending: false })
      .limit(10),
  ]);

  if (topicError || historyError) {
    throw new Error("Riwayat belajar tidak dapat dimuat.");
  }

  const previousTopicIds = [
    ...new Set((previousNotes ?? []).map((item) => item.topic_id)),
  ];

  const previousSessionIds = [
    ...new Set((previousNotes ?? []).map((item) => item.session_id)),
  ];

  const [
    { data: previousTopics, error: previousTopicsError },
    { data: previousSessions, error: previousSessionsError },
  ] = await Promise.all([
    previousTopicIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from("learning_topics")
          .select("id, name")
          .in("id", previousTopicIds),
    previousSessionIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from("sessions")
          .select("id, starts_at")
          .in("id", previousSessionIds),
  ]);

  if (previousTopicsError || previousSessionsError)
    throw new Error("Riwayat materi tidak dapat dimuat.");

  return {
    session,
    student,
    note,
    topic,
    profile,
    history: (previousNotes ?? []).map((entry) => ({
      ...entry,
      topicName:
        previousTopics.find(
          (previousTopic) => previousTopic.id === entry.topic_id,
        )?.name ?? "Materi",
      startsAt:
        previousSessions.find(
          (previousSession) => previousSession.id === entry.session_id,
        )?.starts_at ?? entry.updated_at,
    })),
  };
}

export async function getStudentSchedulesAndSessions(studentId: string) {
  const supabase = await createClient();

  const [
    { data: rules, error: rulesError },
    { data: sessions, error: sessionsError },
  ] = await Promise.all([
    supabase
      .from("schedule_rules")
      .select("*")
      .eq("student_id", studentId)
      .order("weekday"),
    supabase
      .from("sessions")
      .select("id, starts_at, ends_at, state, version, occurrence_date")
      .eq("student_id", studentId)
      .order("starts_at", { ascending: false })
      .limit(30),
  ]);

  if (rulesError || sessionsError) {
    throw new Error("Jadwal dan riwayat murid tidak dapat dimuat.");
  }

  const sessionIds = sessions.map((session) => session.id);

  const { data: notes, error: notesError } =
    sessionIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("session_notes")
          .select("session_id, topic_id, understanding, note")
          .in("session_id", sessionIds);

  if (notesError) throw new Error("Catatan murid tidak dapat dimuat.");

  const topicIds = [...new Set(notes.map((note) => note.topic_id))];

  const { data: topics, error: topicsError } =
    topicIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("learning_topics")
          .select("id, name")
          .in("id", topicIds);

  if (topicsError) throw new Error("Materi murid tidak dapat dimuat.");

  return {
    rules,
    sessions: sessions.map((session) => {
      const note = notes.find((item) => item.session_id === session.id) ?? null;

      return {
        ...session,
        note,
        topic: topics.find((topic) => topic.id === note?.topic_id) ?? null,
      };
    }),
  };
}
