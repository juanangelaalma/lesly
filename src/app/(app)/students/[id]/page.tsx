import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarPlusIcon,
  NotePencilIcon,
  PhoneIcon,
  WhatsappLogoIcon,
} from "@phosphor-icons/react/ssr";
import { PageHeader } from "@/components/ui/page-header";
import { Card, SectionTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { ActionForm } from "@/components/ui/action-form";
import { Disclosure } from "@/components/ui/disclosure";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/field";
import {
  getLearningHistory,
  getScheduleRules,
  getStudent,
  getStudentInvoices,
  getStudentPlans,
  getUpcomingSessions,
} from "@/features/students/queries";
import { setBillingPlan, setStudentStatus } from "@/features/students/actions";
import { currentPlan } from "@/features/students/current-plan";
import { addScheduleRule, endScheduleRule } from "@/features/scheduling/actions";
import { RuleFields } from "@/features/scheduling/components/rule-fields";
import { BILLING_MODE_LABEL, INVOICE_STATUS, asInvoiceStatus } from "@/features/billing/labels";
import { SESSION_STATUS, UNDERSTANDING_TONE } from "@/features/sessions/labels";
import { UNDERSTANDING_LABEL } from "@/features/reports/templates";
import { requireUser } from "@/lib/auth/require-user";
import { formatClock, formatDateLong, formatDateShort, formatPeriod, localDate, localTime, weekdayName } from "@/lib/dates";
import { formatRupiah } from "@/lib/money";
import { formatPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "Detail murid" };

export default async function StudentPage({ params, searchParams }: PageProps<"/students/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const before = typeof query.before === "string" && !Number.isNaN(Date.parse(query.before)) ? query.before : undefined;
  const tutor = await requireUser();
  const student = await getStudent(id);
  const [plans, rules, upcoming, history, invoices] = await Promise.all([
    getStudentPlans(id),
    getScheduleRules(id),
    getUpcomingSessions(id),
    getLearningHistory(id, before),
    getStudentInvoices(id),
  ]);
  const today = localDate(new Date(), tutor.tz);
  const plan = currentPlan(plans, today);
  const activeRules = rules.filter((r) => !r.active_until || r.active_until >= today);
  const archived = student.status === "archived";

  return (
    <>
      <PageHeader
        title={student.name}
        backHref="/students"
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {[student.grade, student.subject].filter(Boolean).join(" · ") || "Belum ada kelas/mapel"}
            {archived ? <Badge>Diarsipkan</Badge> : null}
          </span>
        }
        action={
          <Link href={`/students/${id}/edit`} aria-label="Ubah data murid" className={buttonClass("secondary", "sm")}>
            <NotePencilIcon size={18} weight="bold" aria-hidden /> Ubah
          </Link>
        }
      />

      {query.created === "1" ? (
        <p role="status" className="mb-4 rounded-[var(--radius-inner)] border-2 border-teal-deep/40 bg-teal-soft px-4 py-3 text-sm">
          Murid tersimpan. Sekarang atur jadwal mingguannya di bawah.
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3">
          <SectionTitle>Orang tua</SectionTitle>
          {student.guardian_phone ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{student.guardian_name ?? "Orang tua/wali"}</p>
                <p className="tabular text-sm text-ink-muted">{formatPhone(student.guardian_phone)}</p>
              </div>
              <div className="flex gap-2">
                <a href={`tel:${student.guardian_phone}`} aria-label="Telepon" className={buttonClass("secondary", "sm")}>
                  <PhoneIcon size={18} weight="bold" aria-hidden />
                </a>
                <a
                  href={`https://wa.me/${student.guardian_phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClass("secondary", "sm")}
                >
                  <WhatsappLogoIcon size={18} weight="bold" aria-hidden /> Chat
                </a>
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">
              {student.guardian_name ? `${student.guardian_name}. ` : ""}Nomor WhatsApp belum diisi.{" "}
              <Link href={`/students/${id}/edit`} className="font-label font-bold text-ink underline underline-offset-4">Tambahkan</Link>
            </p>
          )}
          {student.address ? <p className="text-sm text-ink-muted">{student.address}</p> : null}
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <SectionTitle>Tarif</SectionTitle>
            {plan ? <Badge tone={plan.mode === "monthly" ? "purple" : "gold"}>{BILLING_MODE_LABEL[plan.mode]}</Badge> : null}
          </div>
          {plan ? (
            <p>
              <span className="tabular font-display text-2xl font-bold">{formatRupiah(plan.amount)}</span>
              <span className="text-ink-muted"> {plan.mode === "monthly" ? "per bulan" : "per sesi selesai"}</span>
            </p>
          ) : (
            <p className="text-sm text-ink-muted">Belum ada tarif.</p>
          )}
          {plans.length > 1 ? (
            <ul className="flex flex-col gap-1 border-t-2 border-dashed border-line pt-3 text-sm">
              {plans.map((p) => (
                <li key={p.id} className="flex justify-between gap-2">
                  <span className="text-ink-muted">Mulai {formatDateShort(p.effective_from)} {p.effective_from.slice(0, 4)}</span>
                  <span className="tabular">
                    {BILLING_MODE_LABEL[p.mode]} · {formatRupiah(p.amount)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {!archived ? (
            <Disclosure summary="Ubah tarif">
              <ActionForm action={setBillingPlan} submitLabel="Simpan tarif" variant="secondary">
                <input type="hidden" name="studentId" value={id} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Model" htmlFor="billingMode">
                    <Select id="billingMode" name="billingMode" defaultValue={plan?.mode ?? "monthly"}>
                      <option value="monthly">Bulanan</option>
                      <option value="per_session">Per sesi</option>
                    </Select>
                  </Field>
                  <Field label="Tarif (Rp)" htmlFor="amount">
                    <Input id="amount" name="amount" inputMode="numeric" defaultValue={plan?.amount} required className="tabular" />
                  </Field>
                </div>
                <Field label="Berlaku mulai" htmlFor="effectiveFrom" hint="Tagihan yang sudah dibuat tidak ikut berubah.">
                  <Input id="effectiveFrom" name="effectiveFrom" type="date" defaultValue={today} required />
                </Field>
              </ActionForm>
            </Disclosure>
          ) : null}
        </Card>

        <Card className="flex flex-col gap-3">
          <SectionTitle>Jadwal mingguan</SectionTitle>
          {activeRules.length === 0 ? (
            <p className="text-sm text-ink-muted">Belum ada jadwal rutin.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {activeRules.map((rule) => (
                <li key={rule.id} className="rounded-[var(--radius-inner)] border-2 border-line bg-surface-alt/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">
                      {weekdayName(rule.weekday)}, {formatClock(rule.start_time)}
                      <span className="font-normal text-ink-muted"> · {rule.duration_minutes} menit</span>
                    </p>
                  </div>
                  <p className="text-sm text-ink-muted">
                    Sejak {formatDateShort(rule.active_from)}
                    {rule.active_until ? `, sampai ${formatDateShort(rule.active_until)}` : ""}
                  </p>
                  {!rule.active_until ? (
                    <Disclosure summary="Hentikan jadwal ini" className="mt-2 bg-surface">
                      <ActionForm
                        action={endScheduleRule}
                        submitLabel="Hentikan"
                        variant="danger"
                        size="sm"
                        confirmMessage="Sesi terjadwal setelah tanggal ini akan dihapus. Lanjutkan?"
                      >
                        <input type="hidden" name="ruleId" value={rule.id} />
                        <Field label="Sesi terakhir tanggal" htmlFor={`until-${rule.id}`}>
                          <Input id={`until-${rule.id}`} name="until" type="date" defaultValue={today} required />
                        </Field>
                      </ActionForm>
                    </Disclosure>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {!archived ? (
            <Disclosure summary="Tambah jadwal rutin" defaultOpen={query.created === "1"}>
              <ActionForm action={addScheduleRule} submitLabel="Simpan jadwal" variant="secondary">
                <RuleFields studentId={id} today={today} />
              </ActionForm>
            </Disclosure>
          ) : null}
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <SectionTitle>Sesi mendatang</SectionTitle>
            {!archived ? (
              <ButtonLink href={`/sessions/new?student=${id}`} size="sm" variant="secondary">
                <CalendarPlusIcon size={18} weight="bold" aria-hidden /> Sesi tambahan
              </ButtonLink>
            ) : null}
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-ink-muted">Tidak ada sesi terjadwal.</p>
          ) : (
            <ul className="flex flex-col divide-y-2 divide-dashed divide-line">
              {upcoming.map((s) => (
                <li key={s.id}>
                  <Link href={`/sessions/${s.id}`} className="flex items-center justify-between gap-2 py-2.5">
                    <span>
                      {formatDateLong(localDate(s.starts_at, tutor.tz))}
                      <span className="text-ink-muted"> · {localTime(s.starts_at, tutor.tz).replace(":", ".")}</span>
                    </span>
                    {s.rescheduled ? <Badge tone="purple">Dipindah</Badge> : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <SectionTitle>Riwayat belajar</SectionTitle>
          {history.items.length === 0 ? (
            <EmptyState title="Belum ada riwayat" description="Catatan dari sesi yang selesai akan muncul di sini." className="py-6" />
          ) : (
            <ol className="flex flex-col gap-2">
              {history.items.map((s) => {
                const status = SESSION_STATUS[s.status];
                return (
                  <li key={s.id}>
                    <Link href={`/sessions/${s.id}`} className="block rounded-[var(--radius-inner)] border-2 border-line p-3 hover:bg-surface-alt/60">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-ink-muted">{formatDateLong(localDate(s.starts_at, tutor.tz))}</span>
                        {s.session_notes ? (
                          <Badge tone={UNDERSTANDING_TONE[s.session_notes.understanding]}>
                            {UNDERSTANDING_LABEL[s.session_notes.understanding]}
                          </Badge>
                        ) : (
                          <Badge tone={status.tone}>{status.label}</Badge>
                        )}
                      </div>
                      {s.session_notes ? (
                        <>
                          <p className="mt-1 font-semibold">{s.session_notes.learning_topics?.name}</p>
                          {s.session_notes.note ? <p className="text-sm text-ink-muted">{s.session_notes.note}</p> : null}
                        </>
                      ) : s.status_reason ? (
                        <p className="mt-1 text-sm text-ink-muted">{s.status_reason}</p>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
          {history.nextCursor || before ? (
            <div className="flex justify-between gap-2">
              {before ? (
                <ButtonLink href={`/students/${id}`} variant="ghost" size="sm">Terbaru</ButtonLink>
              ) : <span />}
              {history.nextCursor ? (
                <ButtonLink href={`/students/${id}?before=${encodeURIComponent(history.nextCursor)}`} variant="secondary" size="sm" scroll={false}>
                  Lebih lama
                </ButtonLink>
              ) : null}
            </div>
          ) : null}
        </Card>

        <Card className="flex flex-col gap-3">
          <SectionTitle>Tagihan</SectionTitle>
          {invoices.length === 0 ? (
            <p className="text-sm text-ink-muted">Belum ada tagihan.</p>
          ) : (
            <ul className="flex flex-col divide-y-2 divide-dashed divide-line">
              {invoices.map((inv) => {
                const status = INVOICE_STATUS[asInvoiceStatus(inv.status)];
                return (
                  <li key={inv.id}>
                    <Link href={`/invoices/${inv.id}`} className="flex items-center justify-between gap-2 py-2.5">
                      <span className="min-w-0">{inv.period ? formatPeriod(inv.period) : ""}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="tabular text-sm whitespace-nowrap">{formatRupiah(inv.balance ?? 0)}</span>
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {student.notes ? (
          <Card tone="alt">
            <SectionTitle className="mb-1 text-base">Catatan pribadi</SectionTitle>
            <p className="text-sm whitespace-pre-line">{student.notes}</p>
          </Card>
        ) : null}

        <ActionForm
          action={setStudentStatus}
          submitLabel={archived ? "Aktifkan kembali" : "Arsipkan murid"}
          variant={archived ? "secondary" : "danger"}
          confirmMessage={
            archived
              ? undefined
              : "Arsipkan murid ini? Jadwal rutin dihentikan dan sesi mendatang dihapus. Riwayat dan tagihan tetap tersimpan."
          }
        >
          <input type="hidden" name="studentId" value={id} />
          <input type="hidden" name="version" value={student.version} />
          <input type="hidden" name="status" value={archived ? "active" : "archived"} />
        </ActionForm>
      </div>
    </>
  );
}
