export type NormalizedPhone =
  { valid: true; value: string | null } | { valid: false; value: null };

export function normalizeIndonesianPhone(value: string): NormalizedPhone {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return { valid: true, value: null };
  }

  let internationalDigits = digits;

  if (internationalDigits.startsWith("0")) {
    internationalDigits = `62${internationalDigits.slice(1)}`;
  } else if (internationalDigits.startsWith("8")) {
    internationalDigits = `62${internationalDigits}`;
  }

  if (
    internationalDigits.startsWith("62") &&
    /^62[0-9]{8,13}$/.test(internationalDigits)
  ) {
    return { valid: true, value: `+${internationalDigits}` };
  }

  if (/^[1-9][0-9]{7,14}$/.test(internationalDigits)) {
    return { valid: true, value: `+${internationalDigits}` };
  }

  return { valid: false, value: null };
}
