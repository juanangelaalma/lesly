import { formatLocalDate } from "@/lib/format";
import type { LearningUnderstanding } from "@/types/database";

const UNDERSTANDING_LABELS: Record<LearningUnderstanding, string> = {
  independent: "mandiri",
  assisted: "masih perlu bantuan",
  repeat: "perlu diulang",
};

export function createSessionReport(input: {
  studentName: string;
  guardianName: string | null;
  tutorName: string;
  startsAt: string;
  timezone: string;
  topicName: string;
  understanding: LearningUnderstanding;
  note: string | null;
}) {
  const date = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: input.timezone,
  }).format(new Date(input.startsAt));

  const greeting = input.guardianName
    ? "Halo " +
      input.guardianName +
      ", berikut catatan belajar " +
      input.studentName +
      " hari ini, " +
      date +
      "."
    : "Halo, berikut catatan belajar " +
      input.studentName +
      " hari ini, " +
      date +
      ".";

  const lines = [
    greeting,
    "",
    "Materi: " + input.topicName + ".",
    "Pemahaman: " + UNDERSTANDING_LABELS[input.understanding] + ".",
  ];

  if (input.note?.trim()) {
    lines.push("Catatan: " + input.note.trim());
  }

  lines.push("", "Terima kasih sudah mendampingi proses belajarnya.");

  if (input.tutorName.trim()) lines.push("— " + input.tutorName.trim());

  return lines.join("\n");
}

export function createInvoiceReminder(input: {
  studentName: string;
  guardianName: string | null;
  periodStart: string;
  total: number;
  paid: number;
  remaining: number;
}) {
  const period = formatLocalDate(input.periodStart, {
    month: "long",
    year: "numeric",
  });

  const greeting = input.guardianName
    ? "Halo " +
      input.guardianName +
      ", izin mengingatkan pembayaran les " +
      input.studentName +
      " untuk " +
      period +
      "."
    : "Halo, izin mengingatkan pembayaran les " +
      input.studentName +
      " untuk " +
      period +
      ".";

  return [
    greeting,
    "",
    "Total " +
      formatCurrencyPlain(input.total) +
      ", sudah diterima " +
      formatCurrencyPlain(input.paid) +
      ", sisa " +
      formatCurrencyPlain(input.remaining) +
      ".",
    "Jika sudah transfer, boleh kabari saya agar saya cek dan catat. Terima kasih.",
  ].join("\n");
}

function formatCurrencyPlain(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}
