import type { Metadata } from "next";
import { CalendarPlusIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/ssr";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { AutoSync } from "@/components/layout/auto-sync";
import { SessionCard } from "@/features/sessions/components/session-card";
import { listSessionsBetween } from "@/features/sessions/queries";
import { syncScheduleWindow } from "@/features/scheduling/actions";
import { requireUser } from "@/lib/auth/require-user";
import { addDays, formatDateLong, formatDateShort, isoWeekday, localDate, toInstant } from "@/lib/dates";

export const metadata: Metadata = { title: "Jadwal" };

export default async function SchedulePage({ searchParams }: PageProps<"/schedule">) {
  const params = await searchParams;
  const tutor = await requireUser();
  const today = localDate(new Date(), tutor.tz);
  const requested = typeof params.week === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.week) ? params.week : today;
  const weekStart = addDays(requested, 1 - isoWeekday(requested));
  const weekEnd = addDays(weekStart, 7);
  const sessions = await listSessionsBetween(
    toInstant(weekStart, "00:00", tutor.tz) ?? "",
    toInstant(weekEnd, "00:00", tutor.tz) ?? "",
  );
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const byDay = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const day = localDate(s.starts_at, tutor.tz);
    byDay.set(day, [...(byDay.get(day) ?? []), s]);
  }

  return (
    <>
      <PageHeader
        title="Jadwal"
        subtitle={`${formatDateShort(weekStart)} sampai ${formatDateShort(addDays(weekEnd, -1))}`}
        action={
          <ButtonLink href="/sessions/new" size="sm">
            <CalendarPlusIcon size={18} weight="bold" aria-hidden /> Sesi
          </ButtonLink>
        }
      />
      <AutoSync action={syncScheduleWindow} label="Menyiapkan jadwal" />
      <nav aria-label="Pilih minggu" className="mb-4 flex items-center justify-between gap-2">
        <ButtonLink href={`/schedule?week=${addDays(weekStart, -7)}`} variant="secondary" size="sm" aria-label="Minggu sebelumnya">
          <CaretLeftIcon size={18} weight="bold" aria-hidden />
        </ButtonLink>
        {weekStart !== addDays(today, 1 - isoWeekday(today)) ? (
          <ButtonLink href="/schedule" variant="ghost" size="sm">Minggu ini</ButtonLink>
        ) : (
          <span className="font-label text-sm font-bold text-ink-muted">Minggu ini</span>
        )}
        <ButtonLink href={`/schedule?week=${addDays(weekStart, 7)}`} variant="secondary" size="sm" aria-label="Minggu berikutnya">
          <CaretRightIcon size={18} weight="bold" aria-hidden />
        </ButtonLink>
      </nav>

      <div className="flex flex-col gap-5">
        {days.map((day) => {
          const list = byDay.get(day) ?? [];
          return (
            <section key={day} aria-label={formatDateLong(day)}>
              <h2 className="mb-2 flex items-center gap-2 font-display text-base font-semibold">
                {formatDateLong(day)}
                {day === today ? (
                  <span className="rounded-full border-2 border-ink bg-teal px-2 font-label text-xs font-bold">Hari ini</span>
                ) : null}
              </h2>
              {list.length === 0 ? (
                <p className="rounded-[var(--radius-control)] border-2 border-dashed border-line px-4 py-3 text-sm text-ink-muted">Kosong</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {list.map((s) => (
                    <li key={s.id}>
                      <SessionCard
                        id={s.id}
                        startsAt={s.starts_at}
                        durationMinutes={s.duration_minutes}
                        status={s.status}
                        rescheduled={s.rescheduled}
                        student={s.students}
                        tz={tutor.tz}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
