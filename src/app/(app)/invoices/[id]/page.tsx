import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, SectionTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionForm } from "@/components/ui/action-form";
import { Disclosure } from "@/components/ui/disclosure";
import { Field, Input, Select } from "@/components/ui/field";
import { cn } from "@/components/ui/cn";
import { getInvoice } from "@/features/billing/queries";
import { addInvoiceItem, recordPayment, voidInvoiceItem, voidPayment } from "@/features/billing/actions";
import { INVOICE_STATUS, ITEM_KIND_LABEL, PAYMENT_METHOD_LABEL } from "@/features/billing/labels";
import { invoiceReminderText } from "@/features/reports/templates";
import { ShareActions } from "@/features/reports/share-actions";
import { requireUser } from "@/lib/auth/require-user";
import { formatDateShort, formatPeriod, localDate } from "@/lib/dates";
import { formatRupiah } from "@/lib/money";

export const metadata: Metadata = { title: "Detail tagihan" };

export default async function InvoicePage({ params }: PageProps<"/invoices/[id]">) {
  const { id } = await params;
  const tutor = await requireUser();
  const invoice = await getInvoice(id);
  const status = INVOICE_STATUS[invoice.status];
  const liveItems = invoice.items.filter((item) => !item.voided_at);
  const today = localDate(new Date(), tutor.tz);

  const reminder = invoiceReminderText({
    guardianName: invoice.student.guardian_name,
    studentName: invoice.student.name,
    period: invoice.period,
    items: liveItems.map((item) => ({ description: item.description, amount: item.amount })),
    total: invoice.total,
    paid: invoice.paid,
    signature: tutor.profile.report_signature || tutor.profile.display_name,
  });

  return (
    <>
      <PageHeader
        title={invoice.student.name}
        subtitle={<Link href={`/students/${invoice.student.id}`} className="underline underline-offset-4">Tagihan {formatPeriod(invoice.period)}</Link>}
        backHref={`/invoices?month=${invoice.period.slice(0, 7)}`}
      />

      <div className="flex flex-col gap-4">
        <Card tone={invoice.status === "paid" ? "teal" : invoice.status === "empty" ? "surface" : "coral"} className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="font-label text-sm font-bold text-ink-muted">Sisa tagihan</p>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <p className="tabular font-display text-3xl font-bold">{formatRupiah(invoice.balance)}</p>
          <p className="tabular text-sm">
            Dibayar {formatRupiah(invoice.paid)} dari total {formatRupiah(invoice.total)}
          </p>
        </Card>

        {invoice.balance > 0 ? (
          <Card className="flex flex-col gap-3">
            <SectionTitle>Catat pembayaran</SectionTitle>
            <ActionForm action={recordPayment} submitLabel="Simpan pembayaran" resetOnSuccess>
              <input type="hidden" name="invoiceId" value={id} />
              <input type="hidden" name="requestKey" value={crypto.randomUUID()} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nominal (Rp)" htmlFor="amount" hint={`Maksimal ${formatRupiah(invoice.balance)}`}>
                  <Input id="amount" name="amount" inputMode="numeric" defaultValue={invoice.balance} required className="tabular" />
                </Field>
                <Field label="Tanggal" htmlFor="paidOn">
                  <Input id="paidOn" name="paidOn" type="date" defaultValue={today} required />
                </Field>
              </div>
              <Field label="Metode" htmlFor="method">
                <Select id="method" name="method" defaultValue="transfer">
                  {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Catatan" htmlFor="payment-note" optional>
                <Input id="payment-note" name="note" maxLength={200} placeholder="Transfer BCA" />
              </Field>
            </ActionForm>
          </Card>
        ) : null}

        <Card className="flex flex-col gap-3">
          <SectionTitle>Rincian</SectionTitle>
          {invoice.items.length === 0 ? (
            <p className="text-sm text-ink-muted">Belum ada biaya di tagihan ini.</p>
          ) : (
            <ul className="flex flex-col divide-y-2 divide-dashed divide-line">
              {invoice.items.map((item) => (
                <li key={item.id} className={cn("py-2.5", item.voided_at && "opacity-60")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={cn("font-semibold", item.voided_at && "line-through")}>{item.description}</p>
                      <p className="text-xs text-ink-muted">
                        {ITEM_KIND_LABEL[item.kind]}
                        {item.voided_at ? ` · dibatalkan: ${item.void_reason}` : ""}
                      </p>
                    </div>
                    <span className={cn("tabular shrink-0", item.voided_at && "line-through")}>{formatRupiah(item.amount)}</span>
                  </div>
                  {!item.voided_at && item.kind !== "session" ? (
                    <Disclosure summary="Batalkan item" className="mt-2">
                      <ActionForm action={voidInvoiceItem} submitLabel="Batalkan item" variant="danger" size="sm">
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="invoiceId" value={id} />
                        <Field label="Alasan" htmlFor={`void-item-${item.id}`}>
                          <Input id={`void-item-${item.id}`} name="reason" required minLength={3} maxLength={200} />
                        </Field>
                      </ActionForm>
                    </Disclosure>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <Disclosure summary="Tambah penyesuaian atau saldo awal">
            <ActionForm action={addInvoiceItem} submitLabel="Tambahkan" variant="secondary" resetOnSuccess>
              <input type="hidden" name="invoiceId" value={id} />
              <input type="hidden" name="requestKey" value={crypto.randomUUID()} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Jenis" htmlFor="kind">
                  <Select id="kind" name="kind" defaultValue="adjustment">
                    <option value="adjustment">Penyesuaian</option>
                    <option value="opening_balance">Saldo awal</option>
                  </Select>
                </Field>
                <Field label="Arah" htmlFor="direction" hint="Saldo awal selalu menambah.">
                  <Select id="direction" name="direction" defaultValue="add">
                    <option value="add">Tambah biaya</option>
                    <option value="subtract">Potongan</option>
                  </Select>
                </Field>
              </div>
              <Field label="Nominal (Rp)" htmlFor="item-amount">
                <Input id="item-amount" name="amount" inputMode="numeric" required className="tabular" />
              </Field>
              <Field label="Keterangan" htmlFor="description">
                <Input id="description" name="description" required maxLength={160} placeholder="Buku latihan" />
              </Field>
            </ActionForm>
          </Disclosure>
        </Card>

        <Card className="flex flex-col gap-3">
          <SectionTitle>Riwayat pembayaran</SectionTitle>
          {invoice.payments.length === 0 ? (
            <p className="text-sm text-ink-muted">Belum ada pembayaran tercatat.</p>
          ) : (
            <ul className="flex flex-col divide-y-2 divide-dashed divide-line">
              {invoice.payments.map((payment) => {
                const voided = payment.status === "void";
                return (
                  <li key={payment.id} className={cn("py-2.5", voided && "opacity-60")}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={cn("tabular font-semibold", voided && "line-through")}>{formatRupiah(payment.amount)}</p>
                        <p className="text-xs text-ink-muted">
                          {formatDateShort(payment.paid_on)} · {PAYMENT_METHOD_LABEL[payment.method]}
                          {payment.note ? ` · ${payment.note}` : ""}
                        </p>
                        {voided ? <p className="text-xs text-ink-muted">Dibatalkan: {payment.void_reason}</p> : null}
                      </div>
                      {voided ? <Badge>Dibatalkan</Badge> : null}
                    </div>
                    {!voided ? (
                      <Disclosure summary="Salah catat? Batalkan" className="mt-2">
                        <ActionForm action={voidPayment} submitLabel="Batalkan pembayaran" variant="danger" size="sm">
                          <input type="hidden" name="paymentId" value={payment.id} />
                          <input type="hidden" name="invoiceId" value={id} />
                          <Field label="Alasan" htmlFor={`void-pay-${payment.id}`} hint="Catatan lama tetap tersimpan di riwayat.">
                            <Input id={`void-pay-${payment.id}`} name="reason" required minLength={3} maxLength={200} placeholder="Nominal salah ketik" />
                          </Field>
                        </ActionForm>
                      </Disclosure>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {invoice.total > 0 ? (
          <Card className="flex flex-col gap-3">
            <SectionTitle>{invoice.balance > 0 ? "Kirim pengingat" : "Kirim rincian"}</SectionTitle>
            <p className="rounded-[var(--radius-inner)] border-2 border-line bg-surface-alt/60 p-3 text-sm whitespace-pre-line">{reminder}</p>
            <ShareActions text={reminder} phone={invoice.student.guardian_phone} entityId={id} kind="reminder" />
          </Card>
        ) : null}
      </div>
    </>
  );
}
