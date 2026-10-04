const INDONESIA_UTC_OFFSETS = {
  "Asia/Jakarta": 7,
  "Asia/Pontianak": 7,
  "Asia/Makassar": 8,
  "Asia/Jayapura": 9,
} satisfies Record<string, number>;

export function getIndonesianUtcOffset(timezone: string) {
  const offset = Object.entries(INDONESIA_UTC_OFFSETS).find(
    ([zone]) => zone === timezone,
  )?.[1];

  if (offset === undefined) {
    throw new Error("Zona waktu guru tidak didukung.");
  }

  return offset;
}

export function dateInputValueInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return value("year") + "-" + value("month") + "-" + value("day");
}

export function localDateTimeToIso(value: string, timezone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    throw new Error("Tanggal dan jam sesi tidak valid.");
  }

  const [, year, month, day, hour, minute] = match;
  const offset = getIndonesianUtcOffset(timezone);

  const localDate = new Date(0);
  localDate.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
  localDate.setUTCHours(Number(hour), Number(minute), 0, 0);

  if (
    localDate.getUTCFullYear() !== Number(year) ||
    localDate.getUTCMonth() !== Number(month) - 1 ||
    localDate.getUTCDate() !== Number(day) ||
    Number(hour) > 23 ||
    Number(minute) > 59
  ) {
    throw new Error("Tanggal dan jam sesi tidak valid.");
  }

  const localAsUtc = localDate.getTime();
  const converted = new Date(localAsUtc - offset * 60 * 60 * 1000);

  return converted.toISOString();
}

export function isoToLocalDateTime(value: string, timezone: string) {
  const offset = getIndonesianUtcOffset(timezone);
  const local = new Date(new Date(value).getTime() + offset * 60 * 60 * 1000);
  const year = local.getUTCFullYear().toString().padStart(4, "0");
  const month = (local.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = local.getUTCDate().toString().padStart(2, "0");
  const hour = local.getUTCHours().toString().padStart(2, "0");
  const minute = local.getUTCMinutes().toString().padStart(2, "0");

  return year + "-" + month + "-" + day + "T" + hour + ":" + minute;
}

export function indonesiaDayUtcBounds(date: string, timezone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  if (!match) {
    throw new Error("Tanggal agenda tidak valid.");
  }

  const [, year, month, day] = match;
  const offset = getIndonesianUtcOffset(timezone);

  const localDate = new Date(0);
  localDate.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
  localDate.setUTCHours(0, 0, 0, 0);

  if (
    localDate.getUTCFullYear() !== Number(year) ||
    localDate.getUTCMonth() !== Number(month) - 1 ||
    localDate.getUTCDate() !== Number(day)
  ) {
    throw new Error("Tanggal agenda tidak valid.");
  }

  const localMidnightAsUtc = localDate.getTime();

  const start = new Date(localMidnightAsUtc - offset * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { start: start.toISOString(), end: end.toISOString() };
}
