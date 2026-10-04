"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormState } from "@/lib/action-state";
import { createClient } from "@/lib/supabase/server";
import {
  addAdjustmentSchema,
  ensureInvoicesSchema,
  recordPaymentSchema,
  voidPaymentSchema,
} from "@/features/billing/schemas";

function value(formData: FormData, name: string) {
  return formData.get(name)?.toString() ?? "";
}

function billingError(code?: string) {
  if (code === "23514") {
    return "Nominal melebihi sisa atau membuat total tagihan tidak valid.";
  }

  if (code === "40001") {
    return "Tagihan berubah. Muat ulang sebelum mencoba lagi.";
  }

  return "Perubahan belum tersimpan. Periksa kembali datanya.";
}

export async function ensureInvoicesAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = ensureInvoicesSchema.safeParse({
    period: value(formData, "period"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Pilih periode tagihan yang valid." };
  }

  const periodStart = parsed.data.period + "-01";
  const supabase = await createClient();

  const { error } = await supabase.rpc("ensure_invoices", {
    p_period_from: periodStart,
    p_period_to: periodStart,
  });

  if (error) {
    return { status: "error", message: "Tagihan belum dapat disiapkan." };
  }

  revalidatePath("/invoices");

  return {
    status: "success",
    message: "Tagihan periode ini sudah diperbarui.",
    redirectTo: "/invoices?period=" + parsed.data.period,
  };
}

export async function recordPaymentAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = recordPaymentSchema.safeParse({
    invoiceId: value(formData, "invoiceId"),
    amountRupiah: value(formData, "amountRupiah"),
    receivedOn: value(formData, "receivedOn"),
    method: value(formData, "method"),
    requestKey: value(formData, "requestKey"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Periksa nominal, tanggal, dan metode.",
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("record_payment", {
    p_invoice_id: parsed.data.invoiceId,
    p_amount_rupiah: parsed.data.amountRupiah,
    p_received_on: parsed.data.receivedOn,
    p_method: parsed.data.method,
    p_request_key: parsed.data.requestKey,
  });

  if (error) {
    return { status: "error", message: billingError(error.code) };
  }

  revalidatePath("/invoices");
  revalidatePath("/invoices/" + parsed.data.invoiceId);

  return {
    status: "success",
    message: "Pembayaran tersimpan. Catatan sesi tidak berubah.",
    redirectTo: "/invoices/" + parsed.data.invoiceId,
  };
}

export async function voidPaymentAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = voidPaymentSchema.safeParse({
    invoiceId: value(formData, "invoiceId"),
    paymentId: value(formData, "paymentId"),
    reason: value(formData, "reason"),
    requestKey: value(formData, "requestKey"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Isi alasan pembatalan pembayaran." };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("void_payment", {
    p_payment_id: parsed.data.paymentId,
    p_reason: parsed.data.reason,
    p_request_key: parsed.data.requestKey,
  });

  if (error) {
    return { status: "error", message: billingError(error.code) };
  }

  revalidatePath("/invoices");
  revalidatePath("/invoices/" + parsed.data.invoiceId);
  redirect("/invoices/" + parsed.data.invoiceId);
}

export async function addInvoiceAdjustmentAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = addAdjustmentSchema.safeParse({
    invoiceId: value(formData, "invoiceId"),
    kind: value(formData, "kind"),
    amountSigned: value(formData, "amountSigned"),
    description: value(formData, "description"),
    reason: value(formData, "reason"),
    requestKey: value(formData, "requestKey"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Periksa nominal dan keterangan." };
  }

  if (parsed.data.kind === "opening_balance" && parsed.data.amountSigned < 0) {
    return {
      status: "error",
      message: "Saldo awal harus berupa nominal positif.",
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("add_invoice_adjustment", {
    p_invoice_id: parsed.data.invoiceId,
    p_kind: parsed.data.kind,
    p_amount_signed: parsed.data.amountSigned,
    p_description: parsed.data.description,
    p_reason: parsed.data.reason,
    p_request_key: parsed.data.requestKey,
  });

  if (error) {
    return { status: "error", message: billingError(error.code) };
  }

  revalidatePath("/invoices");
  revalidatePath("/invoices/" + parsed.data.invoiceId);
  redirect("/invoices/" + parsed.data.invoiceId);
}
