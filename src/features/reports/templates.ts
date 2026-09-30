import { formatDateLong, formatPeriod } from "@/lib/dates";
import { formatRupiah } from "@/lib/money";

export type Understanding = "independent" | "assisted" | "repeat";

export const UNDERSTANDING_LABEL: Record<Understanding, string> = {
  independent: "Sudah bisa mandiri",
  assisted: "Masih perlu dibantu",
  repeat: "Perlu diulang",
};

function greeting(guardianName: string | null) {
  return guardianName ? `Halo ${guardianName},` : "Halo Ayah/Bunda,";
}

export type SessionReportInput = {
  guardianName: string | null;
  studentName: string;
  date: string;
  topic: string;
  understanding: Understanding;
  note: string | null;
  signature: string;
};

export function sessionReportText(input: SessionReportInput): string {
  const lines = [
    greeting(input.guardianName),
    `berikut catatan les ${input.studentName} pada ${formatDateLong(input.date)}.`,
    "",
    `Materi: ${input.topic}`,
    `Pemahaman: ${UNDERSTANDING_LABEL[input.understanding]}`,
  ];
  if (input.note) lines.push(`Catatan: ${input.note}`);
  lines.push("", "Terima kasih.", input.signature);
  return lines.join("\n");
}

export type ReminderInput = {
  guardianName: string | null;
  studentName: string;
  period: string;
  items: { description: string; amount: number }[];
  total: number;
  paid: number;
  signature: string;
};

export function invoiceReminderText(input: ReminderInput): string {
  const balance = input.total - input.paid;
  const lines = [
    greeting(input.guardianName),
    `berikut rincian biaya les ${input.studentName} untuk ${formatPeriod(input.period)}.`,
    "",
    ...input.items.map((item) => `- ${item.description}: ${formatRupiah(item.amount)}`),
    "",
    `Total: ${formatRupiah(input.total)}`,
  ];
  if (input.paid > 0) lines.push(`Sudah dibayar: ${formatRupiah(input.paid)}`);
  lines.push(balance > 0 ? `Sisa tagihan: ${formatRupiah(balance)}` : "Status: lunas");
  lines.push("", "Terima kasih.", input.signature);
  return lines.join("\n");
}
