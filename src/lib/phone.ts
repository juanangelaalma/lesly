/** Normalizes Indonesian phone input to E.164 (+628...). Returns null when invalid. */
export function normalizePhone(input: string): string | null {
  const compact = input.replace(/[\s().-]/g, "");
  if (!compact) return null;
  let digits: string;
  if (compact.startsWith("+")) digits = compact.slice(1);
  else if (compact.startsWith("00")) digits = compact.slice(2);
  else if (compact.startsWith("0")) digits = `62${compact.slice(1)}`;
  else if (compact.startsWith("8")) digits = `62${compact}`;
  else digits = compact;
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  return `+${digits}`;
}

export function formatPhone(e164: string): string {
  if (e164.startsWith("+62")) {
    const local = `0${e164.slice(3)}`;
    return local.replace(/^(\d{4})(\d{4})(\d+)$/, "$1-$2-$3");
  }
  return e164;
}

export function whatsappUrl(text: string, phone?: string | null): string {
  const digits = phone ? phone.replace(/\D/g, "") : "";
  const base = digits ? `https://wa.me/${digits}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}
