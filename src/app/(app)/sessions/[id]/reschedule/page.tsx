import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RescheduleSessionForm } from "@/features/sessions/forms";
import { getTeacherProfile } from "@/features/scheduling/queries";
import { getSessionDetail } from "@/features/scheduling/queries";
import { isoToLocalDateTime } from "@/lib/dates";

export const metadata: Metadata = { title: "Pindah jadwal sesi" };

export default async function RescheduleSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [result, profile] = await Promise.all([
    getSessionDetail(id),
    getTeacherProfile(),
  ]);

  if (!result || result.session.state !== "scheduled") notFound();

  return (
    <>
      <Link className="back-link" href={"/sessions/" + id}>
        <ArrowLeft aria-hidden="true" size={17} /> Kembali ke sesi
      </Link>
      <div className="page-topline">
        <div>
          <p className="eyebrow">Sesi satu kali</p>
          <h1>Pindah jadwal</h1>
          <p className="page-description">
            Hanya pertemuan ini yang berubah; jadwal rutin lain tetap.
          </p>
        </div>
      </div>
      <RescheduleSessionForm
        endsAt={isoToLocalDateTime(result.session.ends_at, profile.timezone)}
        sessionId={id}
        startsAt={isoToLocalDateTime(
          result.session.starts_at,
          profile.timezone,
        )}
        version={result.session.version}
      />
    </>
  );
}
