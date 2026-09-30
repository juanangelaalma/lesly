import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { asInvoiceStatus, type InvoiceStatus } from "./labels";

export type InvoiceSummary = {
  id: string;
  studentId: string;
  period: string;
  total: number;
  paid: number;
  balance: number;
  status: InvoiceStatus;
};

type BalanceRow = {
  id: string | null;
  student_id: string | null;
  period: string | null;
  total: number | null;
  paid: number | null;
  balance: number | null;
  status: string | null;
};

export function toSummary(row: BalanceRow): InvoiceSummary {
  if (!row.id || !row.student_id || !row.period) throw new Error("invoice_balances row without id");
  return {
    id: row.id,
    studentId: row.student_id,
    period: row.period,
    total: row.total ?? 0,
    paid: row.paid ?? 0,
    balance: row.balance ?? 0,
    status: asInvoiceStatus(row.status),
  };
}

export async function listInvoices(period: string) {
  const supabase = await createClient();
  const [{ data: balances, error }, { data: students, error: studentsError }] = await Promise.all([
    supabase.from("invoice_balances").select("*").eq("period", period),
    supabase.from("students").select("id, name, status"),
  ]);
  if (error) throw error;
  if (studentsError) throw studentsError;
  const names = new Map(students.map((s) => [s.id, s]));
  return balances
    .map((row) => {
      const summary = toSummary(row);
      return { ...summary, student: names.get(summary.studentId) };
    })
    .sort((a, b) => (a.student?.name ?? "").localeCompare(b.student?.name ?? "", "id"));
}

export async function countStudentsMissingInvoice(period: string) {
  const supabase = await createClient();
  const [{ data: students }, { data: invoices }] = await Promise.all([
    supabase.from("students").select("id").eq("status", "active"),
    supabase.from("invoices").select("student_id").eq("period", period),
  ]);
  const invoiced = new Set((invoices ?? []).map((i) => i.student_id));
  return (students ?? []).filter((s) => !invoiced.has(s.id)).length;
}

export async function getInvoice(id: string) {
  const supabase = await createClient();
  const [{ data: balance, error }, { data: items, error: itemsError }, { data: payments, error: paymentsError }] =
    await Promise.all([
      supabase.from("invoice_balances").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("invoice_items")
        .select("id, kind, amount, description, session_id, voided_at, void_reason, created_at")
        .eq("invoice_id", id)
        .order("created_at"),
      supabase
        .from("payments")
        .select("id, amount, paid_on, method, note, status, voided_at, void_reason, created_at")
        .eq("invoice_id", id)
        .order("paid_on", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);
  if (error) throw error;
  if (itemsError) throw itemsError;
  if (paymentsError) throw paymentsError;
  if (!balance) notFound();
  const summary = toSummary(balance);
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, name, guardian_name, guardian_phone, status")
    .eq("id", summary.studentId)
    .single();
  if (studentError) throw studentError;
  return { ...summary, student, items, payments };
}

export async function outstandingTotal() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("invoice_balances").select("balance").gt("balance", 0);
  if (error) throw error;
  return data.reduce((sum, row) => sum + (row.balance ?? 0), 0);
}
