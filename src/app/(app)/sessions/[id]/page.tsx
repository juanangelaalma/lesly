import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircleIcon, ChatTextIcon, NotePencilIcon } from "@phosphor-icons/react/ssr";
import { PageHeader } from "@/components/ui/page-header";
import { Card, SectionTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ActionForm } from "@/components/ui/action-form";
import { Disclosure } from "@/components/ui/disclosure";
import { Field, Input } from "@/components/ui/field";
import { getSession, getSessionAudit } from "@/features/sessions/queries";
import { reopenSession, rescheduleSession, setSessionStatus } from "@/features/sessions/actions";
import { SESSION_STATUS, UNDERSTANDING_TONE } from "@/features/sessions/labels";
import { UNDERSTANDING_LABEL } from "@/features/reports/templates";
import { AuditList } from "@/features/audit/audit-list";
import { requireUser } from "@/lib/auth/require-user";
import { formatDateLong, localDate, localTime } from "@/lib/dates";

export const metadata: Metadata = { title: "Detail sesi" };

export default async function SessionPage({ params }: PageProps<"/sessions/[id]">) {
  const { id } = await params;
  const tutor = await requireUser();
  const [session, audit] = await Promise.all([getSession(id), getSessionAudit(id)]);
  const date = localDate(session.starts_at, tutor.tz);
  const time = localTime(session.starts_at, tutor.tz);
  const end = localTime(new Date(new Date(session.starts_at).getTime() + session.duration_minutes * 60_000), tutor.tz);
  const status = SESSION_STATUS[session.status];

  return (
    <>
      <PageHeader
        title={session.student.name}
        backHref="/today"
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Link href={`/students/${session.student.id}`} className="underline underline-offset-4">Lihat profil murid</Link>
          </span>
        }
      />

      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={status.tone}>{status.label}</Badge>
            {session.rescheduled ? <Badge tone="purple">Dipindah</Badge> : null}
            {!session.rule_id ? <Badge>Sesi tambahan</Badge> : null}
          </div>
          <p className="font-display text-xl font-semibold">{formatDateLong(date)}</p>
          <p className="tabular text-ink-muted">
            {time.replace(":", ".")} sampai {end.replace(":", ".")} · {session.duration_minutes} menit
          </p>
          {session.student.address ? <p className="text-sm text-ink-muted">{session.student.address}</p> : null}
          {session.status_reason ? <p className="text-sm">Alasan: {session.status_reason}</p> : null}
        </Card>

        {session.status === "scheduled" ? (
          <>
            <ButtonLink href={`/sessions/${id}/complete`} className="w-full">
              <CheckCircleIcon size={20} weight="bold" aria-hidden /> Selesaikan sesi
            </ButtonLink>
            <Card className="flex flex-col gap-3">
              <SectionTitle>Ada perubahan?</SectionTitle>
              <Disclosure summary="Pindah jadwal sesi ini">
                <ActionForm action={rescheduleSession} submitLabel="Pindahkan" variant="secondary">
                  <input type="hidden" name="sessionId" value={id} />
                  <input type="hidden" name="version" value={session.version} />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Tanggal baru" htmlFor="date">
                      <Input id="date" name="date" type="date" defaultValue={date} required />
                    </Field>
                    <Field label="Jam mulai" htmlFor="time">
                      <Input id="time" name="time" type="time" defaultValue={time} required />
                    </Field>
                  </div>
                  <Field label="Durasi (menit)" htmlFor="duration">
                    <Input id="duration" name="duration" type="number" inputMode="numeric" min={15} max={480} step={15} defaultValue={session.duration_minutes} required />
                  </Field>
                </ActionForm>
              </Disclosure>
              <Disclosure summary="Murid izin atau sesi batal">
                <ActionForm action={setSessionStatus} submitLabel="Simpan status" variant="secondary">
                  <input type="hidden" name="sessionId" value={id} />
                  <input type="hidden" name="version" value={session.version} />
                  <fieldset className="flex flex-col gap-2">
                    <legend className="mb-1 font-label text-sm font-bold">Status</legend>
                    <label className="flex items-center gap-3">
                      <input type="radio" name="status" value="student_absent" defaultChecked className="size-5 accent-teal-deep" />
                      Murid izin
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="radio" name="status" value="teacher_cancelled" className="size-5 accent-teal-deep" />
                      Dibatalkan guru
                    </label>
                  </fieldset>
                  <Field label="Alasan" htmlFor="reason" optional>
                    <Input id="reason" name="reason" maxLength={200} placeholder="Sakit" />
                  </Field>
                  <p className="text-sm text-ink-muted">Murid bulanan tetap membayar penuh. Murid per sesi tidak ditagih untuk sesi ini.</p>
                </ActionForm>
              </Disclosure>
            </Card>
          </>
        ) : null}

        {session.status === "completed" && session.note ? (
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <SectionTitle>Catatan sesi</SectionTitle>
              <Badge tone={UNDERSTANDING_TONE[session.note.understanding]}>{UNDERSTANDING_LABEL[session.note.understanding]}</Badge>
            </div>
            <p className="font-semibold">{session.note.learning_topics?.name}</p>
            {session.note.note ? <p className="text-ink-muted">{session.note.note}</p> : null}
            <div className="grid grid-cols-2 gap-2">
              <ButtonLink href={`/sessions/${id}/report`}>
                <ChatTextIcon size={20} weight="bold" aria-hidden /> Laporan
              </ButtonLink>
              <ButtonLink href={`/sessions/${id}/note`} variant="secondary">
                <NotePencilIcon size={20} weight="bold" aria-hidden /> Ubah
              </ButtonLink>
            </div>
          </Card>
        ) : null}

        {session.status !== "scheduled" ? (
          <Disclosure summary={session.status === "completed" ? "Koreksi: batalkan status selesai" : "Kembalikan ke terjadwal"}>
            <ActionForm action={reopenSession} submitLabel="Kembalikan ke terjadwal" variant="danger">
              <input type="hidden" name="sessionId" value={id} />
              <input type="hidden" name="version" value={session.version} />
              <Field label="Alasan koreksi" htmlFor="reopen-reason">
                <Input id="reopen-reason" name="reason" required minLength={3} maxLength={200} placeholder="Salah pilih murid" />
              </Field>
              {session.status === "completed" ? (
                <p className="text-sm text-ink-muted">
                  Catatan sesi dihapus dan biaya sesi (jika per sesi) dibatalkan. Tidak bisa dilakukan jika pembayaran sudah melebihi total baru.
                </p>
              ) : null}
            </ActionForm>
          </Disclosure>
        ) : null}

        <AuditList events={audit} tz={tutor.tz} />
      </div>
    </>
  );
}
