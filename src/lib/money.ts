const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export function formatRupiah(amount: number): string {
  return rupiah.format(amount).replace(/\u00a0/g, " ");
}

/** Parses user-typed Rupiah ("Rp 150.000", "150000") into an integer. */
export function parseRupiah(input: string): number | null {
  const digits = input.replace(/[^\d-]/g, "");
  if (!/^-?\d+$/.test(digits)) return null;
  const value = Number(digits);
  return Number.isSafeInteger(value) ? value : null;
}
