import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CompleteSessionForm } from "@/features/sessions/forms";
import { getSessionDetail } from "@/features/scheduling/queries";
import { formatLocalDate } from "@/lib/format";

export const metadata: Metadata = { title: "Catat hasil sesi" };

export default async function CompleteSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getSessionDetail(id);

  if (!result) notFound();
  const { session, student, profile } = result;

  if (session.state === "completed") redirect("/sessions/" + id + "/report");

  if (session.state !== "scheduled") notFound();

  if (new Date(session.starts_at).getTime() > Date.now()) {
    redirect("/sessions/" + id);
  }

  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: profile.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(session.starts_at));

  return (
    <>
      <Link className="back-link" href={"/sessions/" + id}>
        <ArrowLeft aria-hidden="true" size={17} /> Kembali ke sesi
      </Link>
      <div className="page-topline">
        <div>
          <p className="eyebrow">Catatan belajar · {formatLocalDate(day)}</p>
          <h1>Belajar apa hari ini, {student.name}?</h1>
          <p className="page-description">
            Simpan catatan dulu. Membagikan laporan adalah langkah terpisah.
          </p>
        </div>
      </div>
      {result.history.length > 0 ? (
        <section className="callout previous-learning">
          <span>
            Materi terakhir: <strong>{result.history[0].topicName}</strong>.
            {result.history[0].note ? " " + result.history[0].note : ""}
          </span>
        </section>
      ) : null}
      <CompleteSessionForm
        expectedVersion={session.version}
        requestKey={randomUUID()}
        sessionId={id}
      />
    </>
  );
}
