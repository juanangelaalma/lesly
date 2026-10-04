import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdhocSessionForm } from "@/features/scheduling/forms";
import { getStudent } from "@/features/students/queries";
import { getTeacherProfile } from "@/features/scheduling/queries";
import { isoToLocalDateTime } from "@/lib/dates";

export const metadata: Metadata = { title: "Tambah sesi satu kali" };

export default async function NewAdhocSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [result, profile] = await Promise.all([
    getStudent(id),
    getTeacherProfile(),
  ]);

  if (!result || result.student.archived_at) notFound();

  const startsAt = isoToLocalDateTime(
    new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    profile.timezone,
  );

  const endsAt = isoToLocalDateTime(
    new Date(Date.now() + 90 * 60 * 1000).toISOString(),
    profile.timezone,
  );

  return (
    <>
      <Link className="back-link" href={"/students/" + id}>
        <ArrowLeft aria-hidden="true" size={17} /> Kembali ke{" "}
        {result.student.name}
      </Link>
      <div className="page-topline">
        <div>
          <p className="eyebrow">Sesi satu kali</p>
          <h1>Atur pertemuan</h1>
          <p className="page-description">
            Waktu akan disimpan sesuai zona waktu profil guru.
          </p>
        </div>
      </div>
      <AdhocSessionForm studentId={id} startsAt={startsAt} endsAt={endsAt} />
    </>
  );
}
