import type { BadgeTone } from "@/components/ui/badge";

export type InvoiceStatus = "empty" | "unpaid" | "partial" | "paid";

export const INVOICE_STATUS: Record<InvoiceStatus, { label: string; tone: BadgeTone }> = {
  empty: { label: "Belum ada biaya", tone: "neutral" },
  unpaid: { label: "Belum dibayar", tone: "coral" },
  partial: { label: "Dibayar sebagian", tone: "gold" },
  paid: { label: "Lunas", tone: "teal" },
};

export function asInvoiceStatus(value: string | null): InvoiceStatus {
  return value === "unpaid" || value === "partial" || value === "paid" ? value : "empty";
}

export const BILLING_MODE_LABEL = {
  monthly: "Bulanan",
  per_session: "Per sesi",
} as const;

export const PAYMENT_METHOD_LABEL = {
  cash: "Tunai",
  transfer: "Transfer",
  other: "Lainnya",
} as const;

export const ITEM_KIND_LABEL = {
  monthly: "Biaya bulanan",
  session: "Sesi",
  opening_balance: "Saldo awal",
  adjustment: "Penyesuaian",
} as const;
