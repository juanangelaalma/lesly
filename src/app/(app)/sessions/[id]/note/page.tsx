import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { NoteForm } from "@/features/sessions/components/note-form";
import { getSession } from "@/features/sessions/queries";
import { recentTopics } from "@/features/sessions/topics";
import { requireUser } from "@/lib/auth/require-user";
import { localDate, localTime } from "@/lib/dates";

export const metadata: Metadata = { title: "Ubah catatan" };

export default async function EditNotePage({ params }: PageProps<"/sessions/[id]/note">) {
  const { id } = await params;
  const tutor = await requireUser();
  const session = await getSession(id);
  if (session.status !== "completed" || !session.note) redirect(`/sessions/${id}`);
  const topics = await recentTopics(session.student.id);

  return (
    <>
      <PageHeader title="Ubah catatan" subtitle={session.student.name} backHref={`/sessions/${id}`} />
      <NoteForm
        mode="edit"
        sessionId={id}
        version={session.version}
        topics={topics}
        defaults={{
          topic: session.note.learning_topics?.name ?? "",
          understanding: session.note.understanding,
          note: session.note.note ?? "",
        }}
        localStart={{ date: localDate(session.starts_at, tutor.tz), time: localTime(session.starts_at, tutor.tz) }}
      />
    </>
  );
}
