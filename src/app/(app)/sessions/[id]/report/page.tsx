import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ShareActions } from "@/features/reports/share-actions";
import { sessionReportText } from "@/features/reports/templates";
import { getSession, lastShareEvent } from "@/features/sessions/queries";
import { requireUser } from "@/lib/auth/require-user";
import { formatDateShort, localDate, localTime } from "@/lib/dates";

export const metadata: Metadata = { title: "Laporan sesi" };

export default async function ReportPage({ params, searchParams }: PageProps<"/sessions/[id]/report">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const tutor = await requireUser();
  const session = await getSession(id);
  if (session.status !== "completed" || !session.note) redirect(`/sessions/${id}`);
  const lastShare = await lastShareEvent(id, ["report_whatsapp_opened", "report_copied"]);

  const text = sessionReportText({
    guardianName: session.student.guardian_name,
    studentName: session.student.name,
    date: localDate(session.starts_at, tutor.tz),
    topic: session.note.learning_topics?.name ?? "",
    understanding: session.note.understanding,
    note: session.note.note,
    signature: tutor.profile.report_signature || tutor.profile.display_name,
  });

  return (
    <>
      <PageHeader title="Laporan untuk orang tua" subtitle={session.student.name} backHref={`/sessions/${id}`} />
      {query.done === "1" ? (
        <p role="status" className="mb-4 rounded-[var(--radius-inner)] border-2 border-teal-deep/40 bg-teal-soft px-4 py-3 text-sm">
          Sesi tersimpan sebagai selesai. Periksa pesan di bawah sebelum dikirim.
        </p>
      ) : null}
      <div className="flex flex-col gap-4">
        <Card tone="teal">
          <p className="mb-2 font-label text-xs font-bold tracking-wide text-ink-muted uppercase">Pratinjau pesan</p>
          <p className="whitespace-pre-line select-all">{text}</p>
        </Card>
        {!session.student.guardian_phone ? (
          <p className="text-sm text-ink-muted">Nomor WhatsApp orang tua belum diisi, jadi Anda perlu memilih kontak di WhatsApp.</p>
        ) : null}
        <ShareActions text={text} phone={session.student.guardian_phone} entityId={id} kind="report" />
        {lastShare ? (
          <p className="text-sm text-ink-muted">
            Terakhir {lastShare.name === "report_copied" ? "disalin" : "WhatsApp dibuka"} pada{" "}
            {formatDateShort(localDate(lastShare.created_at, tutor.tz))}, {localTime(lastShare.created_at, tutor.tz).replace(":", ".")}.
            Status terkirim atau dibaca tidak tercatat.
          </p>
        ) : null}
      </div>
    </>
  );
}
