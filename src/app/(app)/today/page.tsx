import type { Metadata } from "next";
import Link from "next/link";
import { CalendarBlankIcon, UserPlusIcon } from "@phosphor-icons/react/ssr";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AutoSync } from "@/components/layout/auto-sync";
import { SessionCard } from "@/features/sessions/components/session-card";
import { latestNotes, listSessionsBetween } from "@/features/sessions/queries";
import { syncScheduleWindow } from "@/features/scheduling/actions";
import { outstandingTotal } from "@/features/billing/queries";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { addDays, formatDateLong, localDate, toInstant } from "@/lib/dates";
import { formatRupiah } from "@/lib/money";

export const metadata: Metadata = { title: "Hari ini" };

export default async function TodayPage() {
  const tutor = await requireUser();
  const today = localDate(new Date(), tutor.tz);
  const dayStart = toInstant(today, "00:00", tutor.tz) ?? new Date().toISOString();
  const nextWeek = toInstant(addDays(today, 7), "00:00", tutor.tz) ?? dayStart;
  const tomorrowStart = toInstant(addDays(today, 1), "00:00", tutor.tz) ?? dayStart;

  const supabase = await createClient();
  const [sessions, outstanding, { count: studentCount }] = await Promise.all([
    listSessionsBetween(dayStart, nextWeek),
    outstandingTotal(),
    supabase.from("students").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);
  const todays = sessions.filter((s) => s.starts_at < tomorrowStart);
  const upcoming = sessions.filter((s) => s.starts_at >= tomorrowStart && s.status === "scheduled").slice(0, 3);
  const notes = await latestNotes([...new Set(todays.map((s) => s.students?.id).filter((v): v is string => Boolean(v)))]);
  const remaining = todays.filter((s) => s.status === "scheduled").length;

  return (
    <>
      <header className="pb-4">
        <p className="text-sm text-ink-muted">{formatDateLong(today)}</p>
        <h1 className="font-display text-3xl leading-tight font-bold">Halo, {tutor.profile.display_name}</h1>
        <AutoSync action={syncScheduleWindow} label="Menyiapkan jadwal" />
      </header>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <Card tone="purple" className="p-3.5">
          <p className="font-label text-xs font-bold text-ink-muted">Sisa sesi hari ini</p>
          <p className="tabular font-display text-2xl font-bold">{remaining}</p>
        </Card>
        <Link href="/invoices" className="pressable block rounded-[var(--radius-card)] border-2 border-line bg-coral-soft p-3.5 shadow-clay active:shadow-clay-pressed">
          <p className="font-label text-xs font-bold text-ink-muted">Belum dibayar</p>
          <p className="tabular truncate font-display text-2xl font-bold">{formatRupiah(outstanding)}</p>
        </Link>
      </div>

      {studentCount === 0 ? (
        <EmptyState
          icon={<UserPlusIcon size={36} weight="duotone" />}
          title="Mulai dengan menambah murid"
          description="Isi tarif dan jadwal mingguan, lalu sesi akan muncul otomatis di sini."
          action={<ButtonLink href="/students/new">Tambah murid</ButtonLink>}
        />
      ) : (
        <>
          <section aria-labelledby="today-heading" className="flex flex-col gap-3">
            <h2 id="today-heading" className="font-display text-lg font-semibold">Jadwal hari ini</h2>
            {todays.length === 0 ? (
              <EmptyState
                icon={<CalendarBlankIcon size={32} weight="duotone" />}
                title="Tidak ada sesi hari ini"
                description="Nikmati waktu luang, atau tambahkan sesi di luar jadwal rutin."
                action={<ButtonLink href="/sessions/new" variant="secondary" size="sm">Sesi tambahan</ButtonLink>}
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {todays.map((s) => (
                  <li key={s.id}>
                    <SessionCard
                      id={s.id}
                      startsAt={s.starts_at}
                      durationMinutes={s.duration_minutes}
                      status={s.status}
                      rescheduled={s.rescheduled}
                      student={s.students}
                      tz={tutor.tz}
                      lastNote={s.students ? notes.get(s.students.id) : null}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {upcoming.length > 0 ? (
            <section aria-labelledby="next-heading" className="mt-6 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 id="next-heading" className="font-display text-lg font-semibold">Berikutnya</h2>
                <Link href="/schedule" className="font-label text-sm font-bold underline underline-offset-4">Semua jadwal</Link>
              </div>
              <ul className="flex flex-col gap-2">
                {upcoming.map((s) => (
                  <li key={s.id}>
                    <Link href={`/sessions/${s.id}`} className="flex items-center justify-between gap-2 rounded-[var(--radius-control)] border-2 border-line bg-surface px-4 py-3">
                      <span className="truncate font-semibold">{s.students?.name}</span>
                      <span className="tabular shrink-0 text-sm text-ink-muted">
                        {formatDateLong(localDate(s.starts_at, tutor.tz)).split(",")[0]}, {new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: tutor.tz }).format(new Date(s.starts_at))}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </>
  );
}
