import { z } from "zod";

export const ensureInvoicesSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/),
});

export const recordPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amountRupiah: z.coerce.number().int().min(1).max(100000000),
  receivedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: z.enum(["cash", "bank_transfer"]),
  requestKey: z.string().uuid(),
});

export const voidPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  paymentId: z.string().uuid(),
  reason: z.string().trim().min(1).max(300),
  requestKey: z.string().uuid(),
});

export const addAdjustmentSchema = z.object({
  invoiceId: z.string().uuid(),
  kind: z.enum(["adjustment", "opening_balance"]),
  amountSigned: z.coerce
    .number()
    .int()
    .min(-100000000)
    .max(100000000)
    .refine((amount) => amount !== 0),
  description: z.string().trim().min(1).max(120),
  reason: z.string().trim().min(1).max(300),
  requestKey: z.string().uuid(),
});
