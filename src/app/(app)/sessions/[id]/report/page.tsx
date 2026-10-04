import type { Metadata } from "next";
import { ArrowLeft, ExternalLink, MessageCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CopyReportButton } from "@/features/billing/forms";
import { getSessionDetail } from "@/features/scheduling/queries";
import { createSessionReport } from "@/features/reports/template";

export const metadata: Metadata = { title: "Pratinjau laporan" };

export default async function SessionReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getSessionDetail(id);

  if (!result?.note || !result.topic || result.session.state !== "completed")
    notFound();

  const { note, topic, student, profile, session } = result;

  const report = createSessionReport({
    studentName: student.name,
    guardianName: student.guardian_name,
    tutorName: profile.display_name,
    startsAt: session.starts_at,
    timezone: profile.timezone,
    topicName: topic.name,
    understanding: note.understanding,
    note: note.note,
  });

  const phone = student.guardian_phone_e164?.replace(/\D/g, "");

  const whatsappUrl = phone
    ? "https://wa.me/" + phone + "?text=" + encodeURIComponent(report)
    : null;

  return (
    <>
      <Link className="back-link" href={"/sessions/" + id}>
        <ArrowLeft aria-hidden="true" size={17} /> Kembali ke catatan
      </Link>
      <div className="page-topline">
        <div>
          <p className="eyebrow">Periksa sebelum membagikan</p>
          <h1>Laporan untuk orang tua</h1>
          <p className="page-description">
            Aplikasi hanya membuka WhatsApp. Kamu tetap memeriksa penerima dan
            menekan Kirim di sana.
          </p>
        </div>
      </div>
      <section
        className="card card-pad report-preview"
        aria-label="Pratinjau laporan"
      >
        <p className="eyebrow">
          {student.guardian_name || "Orang tua"} · {student.name}
        </p>
        <pre className="report-text">{report}</pre>
      </section>
      <div className="form-actions report-actions">
        <CopyReportButton text={report} />
        {whatsappUrl ? (
          <a
            className="button"
            href={whatsappUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <MessageCircle aria-hidden="true" size={17} /> Buka WhatsApp
            <ExternalLink aria-hidden="true" size={15} />
          </a>
        ) : (
          <p className="callout">
            <MessageCircle aria-hidden="true" size={17} />
            Nomor WhatsApp orang tua belum tersedia. Kamu masih bisa menyalin
            teks.
          </p>
        )}
      </div>
      <p className="field-hint report-disclaimer">
        Status di sini berarti pratinjau saja; aplikasi tidak mengetahui apakah
        pesan terkirim atau dibaca.
      </p>
    </>
  );
}
