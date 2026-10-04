import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  StudentForm,
  type StudentDraft,
} from "@/features/students/student-form";
import { getStudent } from "@/features/students/queries";
import { getCurrentBillingPlan } from "@/lib/format";

export const metadata: Metadata = { title: "Ubah data murid" };

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getStudent(id);

  if (!result) notFound();

  if (result.student.archived_at) redirect(`/students/${id}`);

  const plan = getCurrentBillingPlan(result.plans);

  if (!plan) {
    throw new Error("Tarif murid tidak ditemukan.");
  }

  const student: StudentDraft = {
    id: result.student.id,
    version: result.student.version,
    name: result.student.name,
    grade: result.student.grade,
    guardianName: result.student.guardian_name,
    guardianPhone: result.student.guardian_phone_e164,
    addressHint: result.student.address_hint,
    startsOn: result.student.starts_on,
    mode: plan.mode,
    rateRupiah: plan.rate_rupiah,
    dueDay: plan.due_day,
  };

  return (
    <>
      <Link className="back-link" href={`/students/${id}`}>
        <ArrowLeft aria-hidden="true" size={17} /> Kembali ke detail
      </Link>
      <div className="page-topline">
        <div>
          <p className="eyebrow">Ubah informasi</p>
          <h1>Data {student.name}</h1>
          <p className="page-description">
            Perubahan tarif disimpan sebagai riwayat baru, bukan menimpa tarif
            lama.
          </p>
        </div>
      </div>
      <StudentForm requestKey={randomUUID()} student={student} />
    </>
  );
}
