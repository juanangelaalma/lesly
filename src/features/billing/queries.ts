import { createClient } from "@/lib/supabase/server";
import { summarizeInvoice } from "@/lib/billing";
import { dateInputValueInTimezone } from "@/lib/dates";

export async function getInvoicesForPeriod(periodStart: string, today: string) {
  const supabase = await createClient();

  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("period_start", periodStart)
    .eq("lifecycle", "active")
    .order("due_date")
    .order("invoice_number");

  if (error) throw new Error("Daftar tagihan tidak dapat dimuat.");

  if (invoices.length === 0) return [];

  const invoiceIds = invoices.map((invoice) => invoice.id);

  const studentIds = [
    ...new Set(invoices.map((invoice) => invoice.student_id)),
  ];

  const [
    { data: students, error: studentsError },
    { data: items, error: itemsError },
    { data: payments, error: paymentsError },
  ] = await Promise.all([
    supabase.from("students").select("id, name").in("id", studentIds),
    supabase
      .from("invoice_items")
      .select("invoice_id, amount_rupiah, state")
      .in("invoice_id", invoiceIds),
    supabase
      .from("payments")
      .select("invoice_id, amount_rupiah, state")
      .in("invoice_id", invoiceIds),
  ]);

  if (studentsError || itemsError || paymentsError) {
    throw new Error("Rincian tagihan tidak dapat dimuat.");
  }

  return invoices.map((invoice) => {
    const invoiceItems = items.filter((item) => item.invoice_id === invoice.id);

    const invoicePayments = payments.filter(
      (payment) => payment.invoice_id === invoice.id,
    );

    return {
      invoice,
      student:
        students.find((student) => student.id === invoice.student_id) ?? null,
      summary: summarizeInvoice(
        invoiceItems,
        invoicePayments,
        invoice.due_date,
        today,
      ),
    };
  });
}

export async function getInvoiceDetail(invoiceId: string) {
  const supabase = await createClient();

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .maybeSingle();

  if (error) throw new Error("Detail tagihan tidak dapat dimuat.");

  if (!invoice) return null;

  const [
    { data: student, error: studentError },
    { data: items, error: itemsError },
    { data: payments, error: paymentsError },
    { data: profile, error: profileError },
  ] = await Promise.all([
    supabase
      .from("students")
      .select("id, name, guardian_name, guardian_phone_e164")
      .eq("id", invoice.student_id)
      .maybeSingle(),
    supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoice.id)
      .order("created_at"),
    supabase
      .from("payments")
      .select("*")
      .eq("invoice_id", invoice.id)
      .order("received_on", { ascending: false }),
    supabase
      .from("teacher_profiles")
      .select("display_name, timezone")
      .maybeSingle(),
  ]);

  if (
    studentError ||
    itemsError ||
    paymentsError ||
    profileError ||
    !student ||
    !profile
  ) {
    throw new Error("Detail tagihan tidak dapat dimuat.");
  }

  const today = dateInputValueInTimezone(new Date(), profile.timezone);

  const summary = summarizeInvoice(items, payments, invoice.due_date, today);

  const sessionIds = items.flatMap((item) =>
    item.session_id ? [item.session_id] : [],
  );

  const { data: sessions, error: sessionsError } =
    sessionIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("sessions")
          .select("id, starts_at")
          .in("id", sessionIds);

  if (sessionsError)
    throw new Error("Rincian sesi tagihan tidak dapat dimuat.");

  return {
    invoice,
    student,
    items: items.map((item) => ({
      ...item,
      session:
        sessions.find((session) => session.id === item.session_id) ?? null,
    })),
    payments,
    profile,
    summary,
  };
}
