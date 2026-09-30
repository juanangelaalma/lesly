import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { StudentForm } from "@/features/students/components/student-form";
import { requireUser } from "@/lib/auth/require-user";
import { localDate, monthStart } from "@/lib/dates";

export const metadata: Metadata = { title: "Tambah murid" };

export default async function NewStudentPage({ searchParams }: PageProps<"/students/new">) {
  const params = await searchParams;
  const tutor = await requireUser();
  const welcome = params.welcome === "1";
  return (
    <>
      <PageHeader
        title={welcome ? "Tambah murid pertama" : "Tambah murid"}
        subtitle={welcome ? "Langkah 2 dari 2. Setelah ini, atur jadwal mingguannya." : undefined}
        backHref={welcome ? undefined : "/students"}
      />
      <StudentForm
        mode="create"
        requestKey={crypto.randomUUID()}
        defaultEffectiveFrom={monthStart(localDate(new Date(), tutor.tz))}
      />
    </>
  );
}
