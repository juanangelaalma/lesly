export const TIMEZONES = {
  "Asia/Jakarta": { label: "WIB", offsetMinutes: 7 * 60 },
  "Asia/Makassar": { label: "WITA", offsetMinutes: 8 * 60 },
  "Asia/Jayapura": { label: "WIT", offsetMinutes: 9 * 60 },
} as const;

export type TimeZone = keyof typeof TIMEZONES;

export function asTimeZone(value: string | null | undefined): TimeZone {
  return value && value in TIMEZONES ? (value as TimeZone) : "Asia/Jakarta";
}

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO date (YYYY-MM-DD) of an instant in the tutor's time zone. */
export function localDate(instant: Date | string, tz: TimeZone): string {
  const shifted = new Date(new Date(instant).getTime() + TIMEZONES[tz].offsetMinutes * 60_000);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/** HH:mm of an instant in the tutor's time zone. */
export function localTime(instant: Date | string, tz: TimeZone): string {
  const shifted = new Date(new Date(instant).getTime() + TIMEZONES[tz].offsetMinutes * 60_000);
  return `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}

/** Converts a local date (YYYY-MM-DD) and time (HH:mm) in the tutor's zone to an ISO instant. */
export function toInstant(date: string, time: string, tz: TimeZone): string | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t) return null;
  const utc = Date.UTC(+d[1], +d[2] - 1, +d[3], +t[1], +t[2]) - TIMEZONES[tz].offsetMinutes * 60_000;
  const result = new Date(utc);
  return Number.isNaN(result.getTime()) ? null : result.toISOString();
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

/** First day of the month (YYYY-MM-01) for a date or YYYY-MM string. */
export function monthStart(value: string): string {
  return `${value.slice(0, 7)}-01`;
}

export function addMonths(period: string, months: number): string {
  const [y, m] = period.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1 + months, 1));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-01`;
}

export function isPeriod(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value));
}

const WEEKDAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** ISO weekday (1 = Senin ... 7 = Minggu) of a local date. */
export function isoWeekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return day === 0 ? 7 : day;
}

export function weekdayName(isoDay: number): string {
  return WEEKDAYS[(isoDay - 1) % 7];
}

export function formatDateLong(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${weekdayName(isoWeekday(date))}, ${d} ${MONTHS[m - 1]} ${y}`;
}

export function formatDateShort(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${d} ${MONTHS[m - 1].slice(0, 3)}`;
}

export function formatPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function formatClock(time: string): string {
  return time.slice(0, 5).replace(":", ".");
}
