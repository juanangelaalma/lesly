import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Edit3,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArchiveStudentForm } from "@/features/students/archive-student-form";
import { EndScheduleRuleForm } from "@/features/scheduling/forms";
import {
  getStudentSchedulesAndSessions,
  getTeacherProfile,
} from "@/features/scheduling/queries";
import { getStudent } from "@/features/students/queries";
import { dateInputValueInTimezone } from "@/lib/dates";
import {
  formatLocalDate,
  formatRupiah,
  getCurrentBillingPlan,
} from "@/lib/format";

export const metadata: Metadata = { title: "Detail murid" };

function formatSessionDay(value: string, timezone: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: timezone,
  }).format(new Date(value));
}

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [result, profile] = await Promise.all([
    getStudent(id),
    getTeacherProfile(),
  ]);

  if (!result) notFound();

  const { student, plans } = result;
  const activity = await getStudentSchedulesAndSessions(student.id);
  const today = dateInputValueInTimezone(new Date(), profile.timezone);
  const currentPlan = getCurrentBillingPlan(plans);

  const billingMode =
    currentPlan?.mode === "per_session" ? "Per sesi selesai" : "Bulanan";

  return (
    <>
      <Link className="back-link" href="/students">
        <ArrowLeft aria-hidden="true" size={17} /> Kembali ke murid
      </Link>
      <div className="page-topline">
        <div>
          <p className="eyebrow">Detail murid</p>
          <h1>{student.name}</h1>
          <p className="page-description">
            {student.grade || "Kelas belum diisi"}
          </p>
        </div>
        {!student.archived_at && (
          <div className="student-actions">
            <Link
              className="button button-secondary button-small"
              href={`/students/${student.id}/edit`}
            >
              <Edit3 aria-hidden="true" size={17} /> Ubah data
            </Link>
            <Link
              className="button button-secondary button-small"
              href={`/students/${student.id}/schedule/new`}
            >
              <CalendarDays aria-hidden="true" size={17} /> Atur jadwal
            </Link>
            <Link
              className="button button-small"
              href={`/students/${student.id}/sessions/new`}
            >
              <ArrowRight aria-hidden="true" size={17} /> Tambah sesi
            </Link>
          </div>
        )}
      </div>

      <div className="section-heading">
        <h2>Jadwal mingguan</h2>
        {!student.archived_at ? (
          <Link
            className="inline-link"
            href={`/students/${student.id}/schedule/new`}
          >
            Tambah jadwal <ArrowRight aria-hidden="true" size={15} />
          </Link>
        ) : null}
      </div>
      {activity.rules.length > 0 ? (
        <section className="schedule-list" aria-label="Jadwal rutin">
          {activity.rules.map((rule) => (
            <article className="card schedule-card" key={rule.id}>
              <div>
                <p className="schedule-title">
                  {
                    [
                      "",
                      "Senin",
                      "Selasa",
                      "Rabu",
                      "Kamis",
                      "Jumat",
                      "Sabtu",
                      "Minggu",
                    ][rule.weekday]
                  }{" "}
                  · {rule.local_start.slice(0, 5)}
                </p>
                <p className="muted-copy">
                  {rule.duration_minutes} menit · mulai{" "}
                  {formatLocalDate(rule.effective_from)}
                  {rule.effective_until
                    ? " · sampai " + formatLocalDate(rule.effective_until)
                    : ""}
                </p>
              </div>
              <span className={"badge " + (rule.active ? "" : "badge-muted")}>
                {rule.active ? "Aktif" : "Berakhir"}
              </span>
              {rule.active && !student.archived_at ? (
                <EndScheduleRuleForm
                  effectiveFrom={rule.effective_from}
                  ruleId={rule.id}
                  today={today}
                />
              ) : null}
            </article>
          ))}
        </section>
      ) : (
        <section className="card empty-state compact-empty">
          <h2>Belum ada jadwal rutin</h2>
          <p>
            Buat pola mingguan, lalu sesi akan muncul otomatis dalam 60 hari ke
            depan.
          </p>
        </section>
      )}

      {student.archived_at && (
        <p className="archive-banner">
          Murid ini diarsipkan. Data lama tetap tersimpan.
        </p>
      )}

      <div className="detail-grid">
        <section
          className="card card-pad"
          aria-labelledby="profile-section-title"
        >
          <h2 id="profile-section-title">Informasi murid</h2>
          <dl className="detail-list">
            <div className="detail-line">
              <dt>Nama</dt>
              <dd>{student.name}</dd>
            </div>
            <div className="detail-line">
              <dt>Kelas</dt>
              <dd>{student.grade || "Belum diisi"}</dd>
            </div>
            <div className="detail-line">
              <dt>Orang tua</dt>
              <dd>{student.guardian_name || "Belum diisi"}</dd>
            </div>
            <div className="detail-line">
              <dt>WhatsApp</dt>
              <dd>{student.guardian_phone_e164 || "Belum diisi"}</dd>
            </div>
            <div className="detail-line">
              <dt>Patokan lokasi</dt>
              <dd>{student.address_hint || "Belum diisi"}</dd>
            </div>
            <div className="detail-line">
              <dt>Mulai belajar</dt>
              <dd>{formatLocalDate(student.starts_on)}</dd>
            </div>
          </dl>
        </section>

        <section
          className="card card-pad"
          aria-labelledby="billing-section-title"
        >
          <h2 id="billing-section-title">Tarif</h2>
          {currentPlan ? (
            <dl className="detail-list">
              <div className="detail-line">
                <dt>Model</dt>
                <dd>{billingMode}</dd>
              </div>
              <div className="detail-line">
                <dt>Nominal</dt>
                <dd>{formatRupiah(currentPlan.rate_rupiah)}</dd>
              </div>
              <div className="detail-line">
                <dt>Jatuh tempo</dt>
                <dd>Tanggal {currentPlan.due_day}</dd>
              </div>
              <div className="detail-line">
                <dt>Berlaku mulai</dt>
                <dd>
                  {formatLocalDate(currentPlan.effective_month, {
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="muted-copy">Informasi tarif belum tersedia.</p>
          )}
        </section>
      </div>

      <div className="section-heading">
        <h2>Tarif sebelumnya</h2>
      </div>
      {plans.some((plan) => plan.id !== currentPlan?.id) ? (
        <section className="card card-pad" aria-label="Riwayat tarif">
          <dl className="detail-list">
            {plans.map((plan) =>
              plan.id === currentPlan?.id ? null : (
                <div className="detail-line" key={plan.id}>
                  <dt>
                    {formatLocalDate(plan.effective_month, {
                      month: "long",
                      year: "numeric",
                    })}
                  </dt>
                  <dd>
                    {formatRupiah(plan.rate_rupiah)} ·{" "}
                    {plan.mode === "monthly" ? "Bulanan" : "Per sesi"}
                  </dd>
                </div>
              ),
            )}
          </dl>
        </section>
      ) : (
        <p className="muted-copy">Belum ada perubahan tarif sebelumnya.</p>
      )}

      <div className="section-heading">
        <h2>Yang bisa kamu lakukan</h2>
      </div>
      <div className="quick-actions">
        <Link className="card quick-action" href="/today">
          <CalendarDays aria-hidden="true" size={19} />
          <span>Agenda belajar</span>
          <ArrowRight aria-hidden="true" size={17} />
        </Link>
        <Link className="card quick-action" href="/invoices">
          <WalletCards aria-hidden="true" size={19} />
          <span>Tagihan</span>
          <ArrowRight aria-hidden="true" size={17} />
        </Link>
        <Link
          className="card quick-action"
          href={`/students/${student.id}/sessions/new`}
        >
          <ArrowRight aria-hidden="true" size={19} />
          <span>Tambah sesi</span>
          <ArrowRight aria-hidden="true" size={17} />
        </Link>
      </div>

      <div className="section-heading">
        <h2>Riwayat sesi</h2>
        <span className="muted-copy">30 terbaru</span>
      </div>
      {activity.sessions.length > 0 ? (
        <section className="history-list card" aria-label="Riwayat sesi murid">
          {activity.sessions.map((session) => {
            const label =
              session.state === "completed"
                ? "Selesai"
                : session.state === "student_absent"
                  ? "Izin"
                  : session.state === "teacher_cancelled"
                    ? "Dibatalkan"
                    : new Date(session.starts_at).getTime() < Date.now()
                      ? "Belum dicatat"
                      : "Terjadwal";

            return (
              <Link
                className="history-row"
                href={`/sessions/${session.id}`}
                key={session.id}
              >
                <span>
                  <strong>
                    {formatSessionDay(session.starts_at, profile.timezone)}
                  </strong>
                  <small>{session.topic?.name ?? label}</small>
                </span>
                <span className="badge">{label}</span>
              </Link>
            );
          })}
        </section>
      ) : (
        <p className="muted-copy">
          Sesi yang sudah dicatat akan tampil di sini.
        </p>
      )}

      {!student.archived_at && (
        <div className="section-heading">
          <h2>Pengelolaan</h2>
        </div>
      )}
      {!student.archived_at && <ArchiveStudentForm studentId={student.id} />}
    </>
  );
}
