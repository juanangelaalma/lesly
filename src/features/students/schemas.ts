import { z } from "zod";
import { normalizePhone } from "@/lib/phone";
import { parseRupiah } from "@/lib/money";

const optionalText = (max: number, label: string) =>
  z.string().max(max, { error: `${label} maksimal ${max} karakter.` });

export const guardianPhone = z.string().transform((value, ctx) => {
  if (!value) return "";
  const normalized = normalizePhone(value);
  if (!normalized) {
    ctx.addIssue({ code: "custom", message: "Nomor WhatsApp tidak valid. Contoh: 0812-3456-7890" });
    return z.NEVER;
  }
  return normalized;
});

export const studentFields = z.object({
  name: z.string().min(1, { error: "Nama murid wajib diisi." }).max(80, { error: "Maksimal 80 karakter." }),
  grade: optionalText(40, "Kelas"),
  subject: optionalText(80, "Mata pelajaran"),
  address: optionalText(200, "Alamat"),
  guardianName: optionalText(80, "Nama wali"),
  guardianPhone,
  notes: optionalText(500, "Catatan"),
});

export const amount = z.string().transform((value, ctx) => {
  const parsed = parseRupiah(value);
  if (parsed === null || parsed <= 0) {
    ctx.addIssue({ code: "custom", message: "Masukkan nominal lebih dari Rp0." });
    return z.NEVER;
  }
  if (parsed > 100_000_000) {
    ctx.addIssue({ code: "custom", message: "Nominal terlalu besar." });
    return z.NEVER;
  }
  return parsed;
});

export const billingMode = z.enum(["monthly", "per_session"], { error: "Pilih model pembayaran." });

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Pilih tanggal." });

export const planFields = z.object({
  billingMode,
  amount,
  effectiveFrom: isoDate,
});
