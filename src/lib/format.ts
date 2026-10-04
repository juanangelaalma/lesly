export function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function jakartaDateInputValue(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const value = (part: string) =>
    parts.find((item) => item.type === part)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function formatLocalDate(
  date: string,
  options: Intl.DateTimeFormatOptions = {},
) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
    ...options,
  }).format(new Date(`${date}T00:00:00Z`));
}

export function getCurrentBillingPlan<T extends { effective_month: string }>(
  plans: T[],
  onDate = new Date(),
) {
  const currentMonthStart = `${jakartaDateInputValue(onDate).slice(0, 7)}-01`;

  return (
    plans.find((plan) => plan.effective_month <= currentMonthStart) ??
    plans.at(-1)
  );
}
