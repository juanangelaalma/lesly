import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  Plus,
} from "lucide-react";
import Link from "next/link";

import { EnsureScheduleWindowForm } from "@/features/scheduling/forms";
import {
  getAgendaForDay,
  getTeacherProfile,
} from "@/features/scheduling/queries";
import { getStudentCount } from "@/features/students/queries";
import { dateInputValueInTimezone, indonesiaDayUtcBounds } from "@/lib/dates";
import { formatLocalDate } from "@/lib/format";

export const metadata: Metadata = { title: "Hari ini" };

function shiftDate(date: string, days: number) {
  const shifted = new Date(date + "T00:00:00Z");
  shifted.setUTCDate(shifted.getUTCDate() + days);

  return shifted.toISOString().slice(0, 10);
}

function timeLabel(value: string, timezone: string) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}

function stateLabel(state: string, startsAt: string) {
  if (state === "completed") return "Selesai dicatat";

  if (state === "student_absent") return "Murid izin";

  if (state === "teacher_cancelled") return "Dibatalkan";

  if (new Date(startsAt).getTime() < Date.now()) return "Belum dicatat";

  return "Terjadwal";
}

function understandingLabel(value: string) {
  if (value === "independent") return "Mandiri";

  if (value === "assisted") return "Masih perlu bantuan";

  return "Perlu diulang";
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const profile = await getTeacherProfile();
  const params = await searchParams;
  const today = dateInputValueInTimezone(new Date(), profile.timezone);

  let selectedDate = today;

  if (params.date) {
    try {
      indonesiaDayUtcBounds(params.date, profile.timezone);
      selectedDate = params.date;
    } catch {
      selectedDate = today;
    }
  }

  const [{ sessions }, studentCount] = await Promise.all([
    getAgendaForDay(selectedDate),
    getStudentCount(),
  ]);

  return (
    <>
      <div className="page-topline">
        <div>
          <p className="eyebrow">Agenda belajar</p>
          <h1>
            {selectedDate === today
              ? "Hari ini"
              : formatLocalDate(selectedDate)}
          </h1>
          <p className="page-description">
            {sessions.length === 1
              ? "1 sesi pada tanggal ini."
              : sessions.length + " sesi pada tanggal ini."}
          </p>
        </div>
        <div className="agenda-tools">
          {selectedDate === today ? (
            <EnsureScheduleWindowForm today={today} />
          ) : (
            <Link
              className="button button-secondary button-small"
              href="/today"
            >
              Hari ini
            </Link>
          )}
          <Link className="button button-small" href="/students">
            <Plus aria-hidden="true" size={17} /> Tambah sesi
          </Link>
        </div>
      </div>

      <nav className="date-switcher" aria-label="Pilih tanggal agenda">
        <Link
          className="button button-secondary button-small"
          href={"/today?date=" + shiftDate(selectedDate, -1)}
        >
          <ArrowLeft aria-hidden="true" size={16} /> Sebelumnya
        </Link>
        <time dateTime={selectedDate}>
          {formatLocalDate(selectedDate, {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </time>
        <Link
          className="button button-secondary button-small"
          href={"/today?date=" + shiftDate(selectedDate, 1)}
        >
          Berikutnya <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </nav>

      {sessions.length > 0 ? (
        <section className="session-list" aria-label="Sesi pada tanggal ini">
          {sessions.map((session) => (
            <Link
              className="session-card card"
              href={"/sessions/" + session.id}
              key={session.id}
            >
              <div className="session-time">
                <strong>
                  {timeLabel(session.starts_at, profile.timezone)}
                </strong>
                <span>{timeLabel(session.ends_at, profile.timezone)}</span>
              </div>
              <div className="session-copy">
                <p className="session-student">
                  {session.student?.name ?? "Murid"}
                </p>
                <p className="session-meta">
                  {session.student?.address_hint ? (
                    <>
                      <MapPin aria-hidden="true" size={14} />
                      {session.student.address_hint}
                    </>
                  ) : (
                    <>
                      <Clock3 aria-hidden="true" size={14} />
                      {session.schedule_rule_id
                        ? "Jadwal rutin"
                        : "Sesi satu kali"}
                    </>
                  )}
                </p>
                {session.note && session.topic ? (
                  <p className="session-last-note">
                    Terakhir: {session.topic.name} ·{" "}
                    {understandingLabel(session.note.understanding)}
                  </p>
                ) : null}
              </div>
              <span
                className={"badge session-state session-state-" + session.state}
              >
                {stateLabel(session.state, session.starts_at)}
              </span>
            </Link>
          ))}
        </section>
      ) : (
        <section className="card empty-state">
          <span className="empty-icon">
            <CalendarDays aria-hidden="true" size={26} />
          </span>
          <h2>Belum ada sesi di tanggal ini</h2>
          <p>
            {studentCount === 0
              ? "Tambahkan murid dulu, lalu atur jadwal rutin atau sesi satu kali."
              : "Buat sesi satu kali dari detail murid atau perbarui agenda rutin."}
          </p>
          <Link
            className="button"
            href={studentCount === 0 ? "/students/new" : "/students"}
          >
            {studentCount === 0 ? "Tambah murid" : "Pilih murid"}
          </Link>
        </section>
      )}

      <div className="callout agenda-note">
        <CalendarDays aria-hidden="true" size={18} />
        <span>
          Sesi yang lewat waktunya tetap berstatus “Belum dicatat” sampai kamu
          mengubah statusnya.
        </span>
      </div>
    </>
  );
}
