import type { InvoiceItemKind } from "@/types/database";

export type InvoiceStatus = "no_charge" | "unpaid" | "partial" | "paid";

export type InvoiceStatusSummary = {
  status: InvoiceStatus;
  isOverdue: boolean;
  total: number;
  paid: number;
  remaining: number;
};

export function summarizeInvoice(
  items: Array<{ amount_rupiah: number; state: string }>,
  payments: Array<{ amount_rupiah: number; state: string }>,
  dueDate: string,
  today: string,
): InvoiceStatusSummary {
  let total = 0;

  for (const item of items) {
    if (item.state === "active") total += item.amount_rupiah;
  }

  let paid = 0;

  for (const payment of payments) {
    if (payment.state === "posted") paid += payment.amount_rupiah;
  }

  if (paid > total) {
    throw new Error("Pembayaran tercatat melebihi total tagihan.");
  }

  const remaining = total - paid;
  let status: InvoiceStatus = "unpaid";

  if (total === 0) status = "no_charge";
  else if (paid === total) status = "paid";
  else if (paid > 0) status = "partial";

  return {
    status,
    isOverdue: remaining > 0 && dueDate < today,
    total,
    paid,
    remaining,
  };
}

export function invoiceItemLabel(kind: InvoiceItemKind) {
  const labels: Record<InvoiceItemKind, string> = {
    monthly: "Biaya les bulanan",
    session: "Sesi belajar",
    opening_balance: "Saldo awal",
    adjustment: "Penyesuaian",
  };

  return labels[kind];
}

export function getInvoiceStatusLabel(
  status: InvoiceStatus,
  isOverdue: boolean,
) {
  if (isOverdue) return "Terlambat";

  const labels: Record<InvoiceStatus, string> = {
    no_charge: "Tidak ada biaya",
    unpaid: "Belum dibayar",
    partial: "Dibayar sebagian",
    paid: "Lunas",
  };

  return labels[status];
}
