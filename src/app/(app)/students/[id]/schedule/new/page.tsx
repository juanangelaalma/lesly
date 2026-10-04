import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ScheduleRuleForm } from "@/features/scheduling/forms";
import { getTeacherProfile } from "@/features/scheduling/queries";
import { getStudent } from "@/features/students/queries";
import { dateInputValueInTimezone } from "@/lib/dates";

export const metadata: Metadata = { title: "Tambah jadwal rutin" };

export default async function NewScheduleRulePage({
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

  const today = dateInputValueInTimezone(new Date(), profile.timezone);

  const effectiveFrom =
    result.student.starts_on > today ? result.student.starts_on : today;

  return (
    <>
      <Link className="back-link" href={"/students/" + id}>
        <ArrowLeft aria-hidden="true" size={17} /> Kembali ke{" "}
        {result.student.name}
      </Link>
      <div className="page-topline">
        <div>
          <p className="eyebrow">Jadwal mingguan</p>
          <h1>Atur les rutin</h1>
          <p className="page-description">
            Satu sesi dibuat untuk tiap tanggal yang cocok dalam 60 hari ke
            depan.
          </p>
        </div>
      </div>
      <ScheduleRuleForm studentId={id} effectiveFrom={effectiveFrom} />
    </>
  );
}
