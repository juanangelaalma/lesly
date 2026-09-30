import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { NoteForm } from "@/features/sessions/components/note-form";
import { getSession } from "@/features/sessions/queries";
import { recentTopics } from "@/features/sessions/topics";
import { requireUser } from "@/lib/auth/require-user";
import { formatDateLong, localDate, localTime } from "@/lib/dates";

export const metadata: Metadata = { title: "Selesaikan sesi" };

export default async function CompleteSessionPage({ params }: PageProps<"/sessions/[id]/complete">) {
  const { id } = await params;
  const tutor = await requireUser();
  const session = await getSession(id);
  if (session.status !== "scheduled") redirect(`/sessions/${id}`);
  const topics = await recentTopics(session.student.id);
  const now = new Date();
  const startsInFuture = new Date(session.starts_at).getTime() > now.getTime();
  const localStart = startsInFuture
    ? { date: localDate(now, tutor.tz), time: localTime(new Date(now.getTime() - session.duration_minutes * 60_000), tutor.tz) }
    : { date: localDate(session.starts_at, tutor.tz), time: localTime(session.starts_at, tutor.tz) };

  return (
    <>
      <PageHeader
        title="Catat hasil sesi"
        subtitle={`${session.student.name} · ${formatDateLong(localDate(session.starts_at, tutor.tz))}`}
        backHref={`/sessions/${id}`}
      />
      <NoteForm
        mode="complete"
        sessionId={id}
        version={session.version}
        requestKey={crypto.randomUUID()}
        topics={topics}
        startsInFuture={startsInFuture}
        localStart={localStart}
      />
    </>
  );
}
