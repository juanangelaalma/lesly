import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, ReceiptText } from "lucide-react";
import Link from "next/link";

import { EnsureInvoicesForm } from "@/features/billing/forms";
import { getInvoicesForPeriod } from "@/features/billing/queries";
import { getTeacherProfile } from "@/features/scheduling/queries";
import { getInvoiceStatusLabel } from "@/lib/billing";
import { dateInputValueInTimezone } from "@/lib/dates";
import { formatLocalDate, formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Tagihan" };

function shiftMonth(period: string, months: number) {
  const date = new Date(period + "-01T00:00:00Z");
  date.setUTCMonth(date.getUTCMonth() + months);

  return date.toISOString().slice(0, 7);
}

function validPeriod(value?: string) {
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return false;

  return true;
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const profile = await getTeacherProfile();
  const profileDate = dateInputValueInTimezone(new Date(), profile.timezone);

  const period = validPeriod(params.period)
    ? (params.period ?? profileDate.slice(0, 7))
    : profileDate.slice(0, 7);

  const periodStart = period + "-01";
  const invoices = await getInvoicesForPeriod(periodStart, profileDate);

  return (
    <>
      <div className="page-topline">
        <div>
          <p className="eyebrow">Pembayaran</p>
          <h1>Tagihan</h1>
          <p className="page-description">
            Catatan pembayaran terpisah dari catatan belajar.
          </p>
        </div>
        <EnsureInvoicesForm initialPeriod={period} />
      </div>

      <nav
        className="date-switcher invoice-switcher"
        aria-label="Pilih periode tagihan"
      >
        <Link
          className="button button-secondary button-small"
          href={"/invoices?period=" + shiftMonth(period, -1)}
        >
          <ArrowLeft aria-hidden="true" size={16} /> Sebelumnya
        </Link>
        <time dateTime={periodStart}>
          {formatLocalDate(periodStart, { month: "long", year: "numeric" })}
        </time>
        <Link
          className="button button-secondary button-small"
          href={"/invoices?period=" + shiftMonth(period, 1)}
        >
          Berikutnya <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </nav>

      {invoices.length > 0 ? (
        <section className="invoice-list" aria-label="Daftar tagihan">
          {invoices.map(({ invoice, student, summary }) => (
            <Link
              className="card invoice-card"
              href={"/invoices/" + invoice.id}
              key={invoice.id}
            >
              <div className="invoice-card-heading">
                <span className="student-initial" aria-hidden="true">
                  {(student?.name ?? "M").slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <p className="invoice-student">{student?.name ?? "Murid"}</p>
                  <p className="invoice-number">
                    {invoice.invoice_number} · jatuh tempo{" "}
                    {formatLocalDate(invoice.due_date, {
                      day: "numeric",
                      month: "short",
                    })}
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
              <div className="invoice-card-totals">
                <span>
                  Total <strong>{formatRupiah(summary.total)}</strong>
                </span>
                <span>
                  Tersisa <strong>{formatRupiah(summary.remaining)}</strong>
                </span>
              </div>
              {summary.status === "paid" &&
              invoice.mode_snapshot === "per_session" ? (
                <p className="invoice-note">
                  Sesi baru pada periode ini akan menambah rincian biaya.
                </p>
              ) : null}
            </Link>
          ))}
        </section>
      ) : (
        <section className="card empty-state">
          <span className="empty-icon">
            <ReceiptText aria-hidden="true" size={27} />
          </span>
          <h2>Belum ada tagihan untuk periode ini</h2>
          <p>
            Siapkan tagihan dari tarif murid. Tagihan bulanan tetap sama meski
            ada sesi izin.
          </p>
        </section>
      )}
    </>
  );
}
