const OFFSET_BY_TIMEZONE: Record<string, string> = { 'Asia/Jakarta': '+07:00', 'Asia/Makassar': '+08:00', 'Asia/Jayapura': '+09:00' };

export function getTimeZoneOffset(timezone: string) {
  return OFFSET_BY_TIMEZONE[timezone] || null;
}
export function getLocalDayBounds(now: Date, timezone: string) {
  const offset = OFFSET_BY_TIMEZONE[timezone];
  if (!offset) throw new RangeError('Zona waktu belum didukung.');
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const start = new Date(`${day}T00:00:00${offset}`);
  return { day, start: start.toISOString(), end: new Date(start.getTime() + 86_400_000 - 1).toISOString() };
}
