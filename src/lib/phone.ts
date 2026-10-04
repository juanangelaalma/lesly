export function normalizePhone(value: string): string | null {
  const compact = value.trim().replace(/[\s().-]/g, '');
  if (!compact) return null;
  const normalized = compact.startsWith('0') ? `+62${compact.slice(1)}` : compact.startsWith('62') ? `+${compact}` : compact.startsWith('+') ? compact : `+62${compact}`;
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
}
