import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { StudentForm } from "@/features/students/components/student-form";
import { getStudent } from "@/features/students/queries";
import { formatPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "Ubah data murid" };

export default async function EditStudentPage({ params }: PageProps<"/students/[id]/edit">) {
  const { id } = await params;
  const student = await getStudent(id);
  return (
    <>
      <PageHeader title="Ubah data murid" subtitle={student.name} backHref={`/students/${id}`} />
      <StudentForm
        mode="edit"
        studentId={student.id}
        version={student.version}
        defaults={{
          name: student.name,
          grade: student.grade ?? "",
          subject: student.subject ?? "",
          address: student.address ?? "",
          guardianName: student.guardian_name ?? "",
          guardianPhone: student.guardian_phone ? formatPhone(student.guardian_phone) : "",
          notes: student.notes ?? "",
        }}
      />
    </>
  );
}
