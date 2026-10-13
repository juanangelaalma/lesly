import Link from "next/link";
import { CaretRightIcon } from "@phosphor-icons/react/ssr";
import { Badge } from "@/components/ui/badge";
import { SESSION_STATUS, UNDERSTANDING_TONE } from "../labels";
import { UNDERSTANDING_LABEL, type Understanding } from "@/features/reports/templates";
import { localTime, type TimeZone } from "@/lib/dates";
import type { Enums } from "@/types/database";

type Props = {
  id: string;
  startsAt: string;
  durationMinutes: number;
  status: Enums<"session_status">;
  rescheduled: boolean;
  student: { name: string; grade: string | null; subject: string | null } | null;
  tz: TimeZone;
  lastNote?: { topic: string; understanding: string } | null;
};

export function SessionCard({ id, startsAt, durationMinutes, status, rescheduled, student, tz, lastNote }: Props) {
  const start = localTime(startsAt, tz).replace(":", ".");
  const end = localTime(new Date(new Date(startsAt).getTime() + durationMinutes * 60_000), tz).replace(":", ".");
  const meta = SESSION_STATUS[status];
  const understanding = lastNote?.understanding as Understanding | undefined;
  return (
    <Link
      href={`/sessions/${id}`}
      className="interactive-row flex gap-3 rounded-[var(--radius-card)] border-2 border-line bg-surface p-4 shadow-clay"
    >
      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-[var(--radius-inner)] border-2 border-ink bg-gold-soft py-2">
        <span className="tabular font-display text-lg leading-none font-bold">{start}</span>
        <span className="tabular mt-1 text-xs text-ink-muted">{end}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="w-full font-display text-base font-semibold">{student?.name ?? "Murid"}</p>
          {status !== "scheduled" ? <Badge tone={meta.tone}>{meta.label}</Badge> : null}
          {rescheduled && status === "scheduled" ? <Badge tone="purple">Dipindah</Badge> : null}
        </div>
        <p className="mt-1 text-sm text-ink-muted">{[student?.grade, student?.subject].filter(Boolean).join(" · ")}</p>
        {lastNote && understanding ? (
          <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm">
            <span className="text-ink-muted">Terakhir:</span>
            <span className="min-w-0 break-words font-semibold">{lastNote.topic}</span>
            <Badge tone={UNDERSTANDING_TONE[understanding]}>{UNDERSTANDING_LABEL[understanding]}</Badge>
          </p>
        ) : null}
      </div>
      <CaretRightIcon size={18} weight="bold" className="shrink-0 self-center text-ink-muted" aria-hidden />
    </Link>
  );
}
