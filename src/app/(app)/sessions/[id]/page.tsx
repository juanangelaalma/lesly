import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  ClipboardPenLine,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  NonbillableSessionForm,
  ReopenSessionForm,
} from "@/features/sessions/forms";
import { getSessionDetail } from "@/features/scheduling/queries";

export const metadata: Metadata = { title: "Detail sesi" };

function formatTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(value));
}

function formatDay(value: string, timezone: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: timezone,
  }).format(new Date(value));
}

function stateLabel(state: string, startsAt: string) {
  if (state === "completed") return "Selesai dicatat";

  if (state === "student_absent") return "Murid izin";

  if (state === "teacher_cancelled") return "Dibatalkan";

  if (new Date(startsAt).getTime() < Date.now()) return "Belum dicatat";

  return "Terjadwal";
}

const UNDERSTANDING_LABELS = {
  independent: "Mandiri",
  assisted: "Masih perlu bantuan",
  repeat: "Perlu diulang",
} as const;

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getSessionDetail(id);

  if (!result) notFound();

  const { session, student, note, topic, profile, history } = result;
  const isScheduled = session.state === "scheduled";

  const canComplete =
    isScheduled && new Date(session.starts_at).getTime() <= Date.now();

  return (
    <>
      <Link className="back-link" href="/today">
        <ArrowLeft aria-hidden="true" size={17} /> Kembali ke agenda
      </Link>
      <div className="page-topline">
        <div>
          <p className="eyebrow">
            Sesi belajar · {stateLabel(session.state, session.starts_at)}
          </p>
          <h1>{student.name}</h1>
          <p className="page-description">
            {formatTime(session.starts_at, profile.timezone)} –{" "}
            {formatTime(session.ends_at, profile.timezone)}
          </p>
        </div>
        {isScheduled ? (
          <Link
            className="button button-secondary"
            href={"/sessions/" + id + "/reschedule"}
          >
            <CalendarClock aria-hidden="true" size={17} /> Pindah jadwal
          </Link>
        ) : null}
      </div>

      {student.address_hint ? (
        <div className="callout session-location">
          <span>Patokan lokasi: {student.address_hint}</span>
        </div>
      ) : null}

      {canComplete ? (
        <section className="card card-pad session-primary-action">
          <div>
            <p className="eyebrow">Setelah mengajar</p>
            <h2>Catat materi yang dipelajari</h2>
            <p className="muted-copy">
              Catatan belajar tersimpan terpisah dari tagihan.
            </p>
          </div>
          <Link className="button" href={"/sessions/" + id + "/complete"}>
            <ClipboardPenLine aria-hidden="true" size={17} /> Selesaikan sesi
          </Link>
        </section>
      ) : null}

      {isScheduled && new Date(session.starts_at).getTime() > Date.now() ? (
        <div className="callout">
          <CalendarClock aria-hidden="true" size={18} />
          <span>
            Sesi yang akan datang belum dapat diselesaikan. Setelah mengajar,
            catat hasilnya di halaman ini.
          </span>
        </div>
      ) : null}

      {note && topic ? (
        <section className="card card-pad session-note-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Catatan sesi</p>
              <h2>{topic.name}</h2>
            </div>
            <span className="badge">
              {UNDERSTANDING_LABELS[note.understanding]}
            </span>
          </div>
          {note.note ? <p className="session-note-text">{note.note}</p> : null}
          <div className="form-actions">
            <Link
              className="button button-secondary button-small"
              href={"/sessions/" + id + "/edit-note"}
            >
              Koreksi catatan
            </Link>
            <Link
              className="button button-small"
              href={"/sessions/" + id + "/report"}
            >
              Lihat pratinjau laporan{" "}
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </div>
        </section>
      ) : null}

      {history.length > 0 ? (
        <>
          <div className="section-heading">
            <h2>Riwayat belajar terbaru</h2>
            <Link className="inline-link" href={"/students/" + student.id}>
              Detail murid
            </Link>
          </div>
          <section
            className="card history-list"
            aria-label="Riwayat belajar murid"
          >
            {history.map((entry) => (
              <Link
                className="history-row"
                href={"/sessions/" + entry.session_id}
                key={entry.id}
              >
                <span>
                  <strong>{entry.topicName}</strong>
                  <small>{formatDay(entry.startsAt, profile.timezone)}</small>
                </span>
                <span className="badge">
                  {UNDERSTANDING_LABELS[entry.understanding]}
                </span>
              </Link>
            ))}
          </section>
        </>
      ) : null}

      {isScheduled ? (
        <NonbillableSessionForm sessionId={id} version={session.version} />
      ) : null}
      {session.state === "completed" ? (
        <ReopenSessionForm
          sessionId={id}
          version={session.version}
          state={session.state}
        />
      ) : null}
    </>
  );
}
