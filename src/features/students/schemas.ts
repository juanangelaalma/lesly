import { z } from "zod";

export const studentFormSchema = z.object({
  studentId: z.string().uuid().nullable(),
  expectedVersion: z
    .string()
    .nullable()
    .transform((value) => (value ? Number(value) : null))
    .refine(
      (value) => value === null || Number.isSafeInteger(value),
      "Versi data tidak valid.",
    ),
  requestKey: z.string().uuid("Kunci permintaan tidak valid."),
  name: z
    .string()
    .trim()
    .min(1, "Nama murid wajib diisi.")
    .max(80, "Nama maksimal 80 karakter."),
  grade: z.string().trim().max(50, "Kelas maksimal 50 karakter."),
  guardianName: z
    .string()
    .trim()
    .max(80, "Nama orang tua maksimal 80 karakter."),
  guardianPhone: z.string().trim().max(32, "Nomor WhatsApp terlalu panjang."),
  addressHint: z
    .string()
    .trim()
    .max(120, "Alamat singkat maksimal 120 karakter."),
  startsOn: z.iso.date("Pilih tanggal mulai yang valid."),
  billingMode: z.enum(["monthly", "per_session"]),
  rateRupiah: z
    .string()
    .regex(/^\d+$/, "Tarif harus berupa angka bulat.")
    .transform(Number)
    .refine(
      (value) => Number.isSafeInteger(value) && value > 0 && value <= 100000000,
      "Tarif harus antara Rp1 dan Rp100.000.000.",
    ),
  dueDay: z
    .string()
    .regex(/^\d{1,2}$/, "Tanggal jatuh tempo harus berupa angka.")
    .transform(Number)
    .refine(
      (value) => Number.isInteger(value) && value >= 1 && value <= 28,
      "Tanggal jatuh tempo harus 1 sampai 28.",
    ),
  effectiveMonth: z.union([
    z.literal(""),
    z.string().regex(/^\d{4}-\d{2}$/, "Pilih bulan yang valid."),
  ]),
});

export type StudentFormValues = z.output<typeof studentFormSchema>;
