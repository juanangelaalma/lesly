import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { ArrowLeft, MessageCircle, ReceiptText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  CopyReportButton,
  InvoiceAdjustmentForm,
  RecordPaymentForm,
  VoidPaymentForm,
} from "@/features/billing/forms";
import { getInvoiceDetail } from "@/features/billing/queries";
import { getInvoiceStatusLabel, invoiceItemLabel } from "@/lib/billing";
import { dateInputValueInTimezone } from "@/lib/dates";
import { createInvoiceReminder } from "@/features/reports/template";
import { formatLocalDate, formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Detail tagihan" };

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getInvoiceDetail(id);

  if (!result) notFound();

  const { invoice, student, items, payments, profile, summary } = result;
  const today = dateInputValueInTimezone(new Date(), profile.timezone);

  const reminder = createInvoiceReminder({
    studentName: student.name,
    guardianName: student.guardian_name,
    periodStart: invoice.period_start,
    total: summary.total,
    paid: summary.paid,
    remaining: summary.remaining,
  });

  const phone = student.guardian_phone_e164?.replace(/\D/g, "");

  const whatsappUrl = phone
    ? "https://wa.me/" + phone + "?text=" + encodeURIComponent(reminder)
    : null;

  return (
    <>
      <Link
        className="back-link"
        href={"/invoices?period=" + invoice.period_start.slice(0, 7)}
      >
        <ArrowLeft aria-hidden="true" size={17} /> Kembali ke tagihan
      </Link>
      <div className="page-topline">
        <div>
          <p className="eyebrow">
            {invoice.invoice_number} ·{" "}
            {invoice.mode_snapshot === "monthly" ? "Bulanan" : "Per sesi"}
          </p>
          <h1>{student.name}</h1>
          <p className="page-description">
            {formatLocalDate(invoice.period_start, {
              month: "long",
              year: "numeric",
            })}{" "}
            · jatuh tempo {formatLocalDate(invoice.due_date)}
          </p>
        </div>
        <span
          className={
            "badge invoice-status invoice-status-" +
            (summary.isOverdue ? "overdue" : summary.status)
          }
        >
          {getInvoiceStatusLabel(summary.status, summary.isOverdue)}
        </span>
      </div>

      <section
        className="card invoice-totals"
        aria-label="Ringkasan pembayaran"
      >
        <div>
          <span>Total tagihan</span>
          <strong>{formatRupiah(summary.total)}</strong>
        </div>
        <div>
          <span>Sudah diterima</span>
          <strong>{formatRupiah(summary.paid)}</strong>
        </div>
        <div>
          <span>Sisa</span>
          <strong>{formatRupiah(summary.remaining)}</strong>
        </div>
      </section>

      <div className="section-heading">
        <h2>Rincian biaya</h2>
      </div>
      {items.length > 0 ? (
        <section
          className="card history-list invoice-items"
          aria-label="Rincian biaya tagihan"
        >
          {items.map((item) => (
            <div
              className={
                "history-row invoice-item " +
                (item.state === "void" ? "invoice-item-void" : "")
              }
              key={item.id}
            >
              <span>
                <strong>
                  {item.description || invoiceItemLabel(item.kind)}
                </strong>
                <small>
                  {invoiceItemLabel(item.kind)}
                  {item.session
                    ? " · " +
                      formatLocalDate(item.session.starts_at.slice(0, 10))
                    : ""}
                  {item.reason ? " · " + item.reason : ""}
                </small>
              </span>
              <span className="invoice-item-amount">
                {item.amount_rupiah < 0 ? "−" : ""}
                {formatRupiah(Math.abs(item.amount_rupiah))}
                {item.state === "void" ? <small>Dibatalkan</small> : null}
              </span>
            </div>
          ))}
        </section>
      ) : (
        <p className="muted-copy">Belum ada biaya pada tagihan ini.</p>
      )}

      <div className="section-heading">
        <h2>Catat pembayaran</h2>
        <p className="muted-copy">
          Menyelesaikan sesi tidak mengubah status pembayaran.
        </p>
      </div>
      <RecordPaymentForm
        invoiceId={invoice.id}
        remaining={summary.remaining}
        requestKey={randomUUID()}
        today={today}
      />

      <div className="section-heading">
        <h2>Riwayat pembayaran</h2>
      </div>
      {payments.length > 0 ? (
        <section className="card payment-list" aria-label="Riwayat pembayaran">
          {payments.map((payment) => (
            <article className="payment-row" key={payment.id}>
              <div className="payment-row-main">
                <div>
                  <strong>{formatRupiah(payment.amount_rupiah)}</strong>
                  <p>
                    {formatLocalDate(payment.received_on)} ·{" "}
                    {payment.method === "cash" ? "Tunai" : "Transfer"}
                  </p>
                </div>
                <span
                  className={
                    "badge " + (payment.state === "posted" ? "" : "badge-muted")
                  }
                >
                  {payment.state === "posted" ? "Tercatat" : "Dibatalkan"}
                </span>
              </div>
              {payment.state === "void" ? (
                <p className="field-hint">Alasan: {payment.void_reason}</p>
              ) : (
                <details className="void-payment-details">
                  <summary>Batalkan catatan ini</summary>
                  <VoidPaymentForm
                    invoiceId={invoice.id}
                    paymentId={payment.id}
                    requestKey={randomUUID()}
                  />
                </details>
              )}
            </article>
          ))}
        </section>
      ) : (
        <p className="muted-copy">Belum ada pembayaran yang dicatat.</p>
      )}

      <div className="section-heading">
        <h2>Penyesuaian</h2>
      </div>
      <InvoiceAdjustmentForm invoiceId={invoice.id} requestKey={randomUUID()} />

      <div className="section-heading">
        <h2>Pengingat untuk orang tua</h2>
      </div>
      <section className="card card-pad report-preview">
        <p className="eyebrow">Periksa sebelum membagikan</p>
        <pre className="report-text">{reminder}</pre>
        <div className="report-actions">
          <CopyReportButton text={reminder} />
          {whatsappUrl ? (
            <a
              className="button button-secondary"
              href={whatsappUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <MessageCircle aria-hidden="true" size={17} /> Buka WhatsApp
            </a>
          ) : (
            <p className="callout">
              <ReceiptText aria-hidden="true" size={17} />
              Nomor WhatsApp orang tua belum tersedia.
            </p>
          )}
        </div>
      </section>
      <p className="field-hint report-disclaimer">
        Aplikasi tidak mengirim pesan dan tidak mengetahui apakah pesan terkirim
        atau dibaca.
      </p>
    </>
  );
}
