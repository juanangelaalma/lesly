import { z } from "zod";

export const understanding = z.enum(["independent", "assisted", "repeat"], { error: "Pilih tingkat pemahaman." });

export const noteFields = z.object({
  topic: z
    .string()
    .transform((v) => v.replace(/\s+/g, " ").trim())
    .pipe(z.string().min(1, { error: "Materi wajib diisi." }).max(120, { error: "Materi maksimal 120 karakter." })),
  understanding,
  note: z.string().max(300, { error: "Catatan maksimal 300 karakter." }),
});

export const localDateTime = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Pilih tanggal." }),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Pilih jam." }),
});
