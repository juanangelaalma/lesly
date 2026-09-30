"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/action-result";
import { fromDbError, fromZodError } from "@/lib/errors";
import { str } from "@/lib/form";
import { parseRupiah } from "@/lib/money";
import { requestKey } from "@/lib/request-key";
import { amount, isoDate } from "@/features/students/schemas";

function revalidateBilling(invoiceId?: string) {
  revalidatePath("/invoices");
  if (invoiceId) revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/students", "layout");
}

/** Creates missing invoices and monthly fees for a period. Returns true when anything changed. */
export async function ensureInvoicesFor(period: string): Promise<boolean> {
  if (!/^\d{4}-\d{2}-01$/.test(period)) return false;
  const supabase = await createClient();
  const { count: invoicesBefore } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("period", period);
  const { data, error } = await supabase.rpc("ensure_invoices", { p_period: period });
  if (error) {
    console.error("ensure_invoices failed", error);
    return false;
  }
  const { count: invoicesAfter } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("period", period);
  return (data as { monthlyFeesCreated: number }).monthlyFeesCreated > 0 || invoicesAfter !== invoicesBefore;
}

export async function recordPayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({
      invoiceId: z.uuid(),
      requestKey,
      amount,
      paidOn: isoDate,
      method: z.enum(["cash", "transfer", "other"]),
      note: z.string().max(200, { error: "Maksimal 200 karakter." }),
    })
    .safeParse({
      invoiceId: str(formData, "invoiceId"),
      requestKey: str(formData, "requestKey"),
      amount: str(formData, "amount"),
      paidOn: str(formData, "paidOn"),
      method: str(formData, "method"),
      note: str(formData, "note"),
    });
  if (!parsed.success) return fromZodError(parsed.error);
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_payment", {
    p_request_key: v.requestKey,
    p_invoice_id: v.invoiceId,
    p_amount: v.amount,
    p_paid_on: v.paidOn,
    p_method: v.method,
    p_note: v.note,
  });
  if (error) return fromDbError(error);
  revalidateBilling(v.invoiceId);
  return { ok: true, data: null, message: "Pembayaran dicatat." };
}

export async function voidPayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({
      paymentId: z.uuid(),
      invoiceId: z.uuid(),
      reason: z.string().min(3, { error: "Tulis alasan minimal 3 karakter." }).max(200),
    })
    .safeParse({ paymentId: str(formData, "paymentId"), invoiceId: str(formData, "invoiceId"), reason: str(formData, "reason") });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("void_payment", { p_payment_id: parsed.data.paymentId, p_reason: parsed.data.reason });
  if (error) return fromDbError(error);
  revalidateBilling(parsed.data.invoiceId);
  return { ok: true, data: null, message: "Pencatatan pembayaran dibatalkan. Riwayatnya tetap tersimpan." };
}

export async function addInvoiceItem(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({
      invoiceId: z.uuid(),
      requestKey,
      kind: z.enum(["adjustment", "opening_balance"]),
      direction: z.enum(["add", "subtract"]),
      amount: z.string(),
      description: z.string().min(1, { error: "Keterangan wajib diisi." }).max(160),
    })
    .safeParse({
      invoiceId: str(formData, "invoiceId"),
      requestKey: str(formData, "requestKey"),
      kind: str(formData, "kind"),
      direction: str(formData, "direction") || "add",
      amount: str(formData, "amount"),
      description: str(formData, "description"),
    });
  if (!parsed.success) return fromZodError(parsed.error);
  const v = parsed.data;
  const value = parseRupiah(v.amount);
  if (value === null || value <= 0) {
    return { ok: false, code: "VALIDATION", message: "Periksa nominal.", fieldErrors: { amount: ["Masukkan nominal lebih dari Rp0."] } };
  }
  const signed = v.kind === "adjustment" && v.direction === "subtract" ? -value : value;

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_invoice_item", {
    p_request_key: v.requestKey,
    p_invoice_id: v.invoiceId,
    p_kind: v.kind,
    p_amount: signed,
    p_description: v.description,
  });
  if (error) return fromDbError(error);
  revalidateBilling(v.invoiceId);
  return { ok: true, data: null, message: "Item tagihan ditambahkan." };
}

export async function voidInvoiceItem(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({
      itemId: z.uuid(),
      invoiceId: z.uuid(),
      reason: z.string().min(3, { error: "Tulis alasan minimal 3 karakter." }).max(200),
    })
    .safeParse({ itemId: str(formData, "itemId"), invoiceId: str(formData, "invoiceId"), reason: str(formData, "reason") });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("void_invoice_item", { p_item_id: parsed.data.itemId, p_reason: parsed.data.reason });
  if (error) return fromDbError(error);
  revalidateBilling(parsed.data.invoiceId);
  return { ok: true, data: null, message: "Item tagihan dibatalkan." };
}
