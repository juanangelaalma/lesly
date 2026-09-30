import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { ActionForm } from "@/components/ui/action-form";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/field";
import { createSession } from "@/features/sessions/actions";
import { listStudents } from "@/features/students/queries";
import { requireUser } from "@/lib/auth/require-user";
import { localDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Sesi tambahan" };

export default async function NewSessionPage({ searchParams }: PageProps<"/sessions/new">) {
  const params = await searchParams;
  const tutor = await requireUser();
  const students = await listStudents("active", "");
  const preselected = typeof params.student === "string" ? params.student : undefined;
  const date = typeof params.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : localDate(new Date(), tutor.tz);

  return (
    <>
      <PageHeader
        title="Sesi tambahan"
        subtitle="Untuk sesi di luar jadwal rutin, misalnya persiapan ujian."
        backHref={preselected ? `/students/${preselected}` : "/schedule"}
      />
      {students.length === 0 ? (
        <EmptyState title="Belum ada murid aktif" action={<ButtonLink href="/students/new">Tambah murid</ButtonLink>} />
      ) : (
        <Card>
          <ActionForm action={createSession} submitLabel="Simpan sesi">
            <input type="hidden" name="requestKey" value={crypto.randomUUID()} />
            <Field label="Murid" htmlFor="studentId">
              <Select id="studentId" name="studentId" defaultValue={preselected ?? ""} required>
                <option value="" disabled>
                  Pilih murid
                </option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tanggal" htmlFor="date">
                <Input id="date" name="date" type="date" defaultValue={date} required />
              </Field>
              <Field label="Jam mulai" htmlFor="time">
                <Input id="time" name="time" type="time" defaultValue="16:00" required />
              </Field>
            </div>
            <Field label="Durasi (menit)" htmlFor="duration">
              <Input id="duration" name="duration" type="number" inputMode="numeric" min={15} max={480} step={15} defaultValue={90} required />
            </Field>
          </ActionForm>
        </Card>
      )}
    </>
  );
}
