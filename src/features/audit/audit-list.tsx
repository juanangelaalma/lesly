import { Disclosure } from "@/components/ui/disclosure";
import { formatDateShort, localDate, localTime, type TimeZone } from "@/lib/dates";
import { auditLabel } from "./labels";

type AuditRow = { id: number; action: string; reason: string | null; created_at: string };

export function AuditList({ events, tz }: { events: AuditRow[]; tz: TimeZone }) {
  if (events.length === 0) return null;
  return (
    <Disclosure summary={`Riwayat perubahan (${events.length})`}>
      <ol className="flex flex-col gap-2 text-sm">
        {events.map((event) => (
          <li key={event.id} className="flex flex-col">
            <span className="font-semibold">{auditLabel(event.action)}</span>
            <span className="text-ink-muted">
              {formatDateShort(localDate(event.created_at, tz))}, {localTime(event.created_at, tz).replace(":", ".")}
              {event.reason ? ` · ${event.reason}` : ""}
            </span>
          </li>
        ))}
      </ol>
    </Disclosure>
  );
}
