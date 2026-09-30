import type { Metadata } from "next";
import Link from "next/link";
import { CaretLeftIcon, CaretRightIcon, ReceiptIcon } from "@phosphor-icons/react/ssr";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AutoSync } from "@/components/layout/auto-sync";
import { listInvoices } from "@/features/billing/queries";
import { ensureInvoicesFor } from "@/features/billing/actions";
import { INVOICE_STATUS } from "@/features/billing/labels";
import { requireUser } from "@/lib/auth/require-user";
import { addMonths, formatPeriod, isPeriod, localDate, monthStart } from "@/lib/dates";
import { formatRupiah } from "@/lib/money";

export const metadata: Metadata = { title: "Tagihan" };

export default async function InvoicesPage({ searchParams }: PageProps<"/invoices">) {
  const params = await searchParams;
  const tutor = await requireUser();
  const current = monthStart(localDate(new Date(), tutor.tz));
  const month = typeof params.month === "string" && isPeriod(params.month) ? `${params.month}-01` : current;
  const invoices = await listInvoices(month);
  const totals = invoices.reduce(
    (acc, inv) => ({ total: acc.total + inv.total, paid: acc.paid + inv.paid, balance: acc.balance + inv.balance }),
    { total: 0, paid: 0, balance: 0 },
  );
  const visible = invoices.filter((inv) => inv.status !== "empty" || inv.student?.status === "active");

  return (
    <>
      <PageHeader title="Tagihan" subtitle={formatPeriod(month)} />
      <AutoSync action={ensureInvoicesFor.bind(null, month)} label="Menyiapkan tagihan bulan ini" />

      <nav aria-label="Pilih bulan" className="mb-4 flex items-center justify-between gap-2">
        <ButtonLink href={`/invoices?month=${addMonths(month, -1).slice(0, 7)}`} variant="secondary" size="sm" aria-label="Bulan sebelumnya">
          <CaretLeftIcon size={18} weight="bold" aria-hidden />
        </ButtonLink>
        {month !== current ? (
          <ButtonLink href="/invoices" variant="ghost" size="sm">Bulan ini</ButtonLink>
        ) : (
          <span className="font-label text-sm font-bold text-ink-muted">Bulan ini</span>
        )}
        <ButtonLink href={`/invoices?month=${addMonths(month, 1).slice(0, 7)}`} variant="secondary" size="sm" aria-label="Bulan berikutnya">
          <CaretRightIcon size={18} weight="bold" aria-hidden />
        </ButtonLink>
      </nav>

      <div className="mb-5 grid grid-cols-3 gap-2">
        <Card className="p-3">
          <p className="font-label text-xs font-bold text-ink-muted">Total</p>
          <p className="tabular truncate font-display text-lg font-bold">{formatRupiah(totals.total)}</p>
        </Card>
        <Card tone="teal" className="p-3">
          <p className="font-label text-xs font-bold text-ink-muted">Diterima</p>
          <p className="tabular truncate font-display text-lg font-bold">{formatRupiah(totals.paid)}</p>
        </Card>
        <Card tone="coral" className="p-3">
          <p className="font-label text-xs font-bold text-ink-muted">Sisa</p>
          <p className="tabular truncate font-display text-lg font-bold">{formatRupiah(totals.balance)}</p>
        </Card>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<ReceiptIcon size={36} weight="duotone" />}
          title="Belum ada tagihan bulan ini"
          description="Tagihan bulanan dibuat otomatis untuk murid aktif. Biaya per sesi masuk setelah sesi diselesaikan."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((inv) => {
            const status = INVOICE_STATUS[inv.status];
            return (
              <li key={inv.id}>
                <Link
                  href={`/invoices/${inv.id}`}
                  className="pressable flex items-center gap-3 rounded-[var(--radius-card)] border-2 border-line bg-surface p-4 shadow-clay active:shadow-clay-pressed"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-base font-semibold">{inv.student?.name ?? "Murid"}</span>
                    <span className="tabular block text-sm text-ink-muted">
                      {formatRupiah(inv.paid)} dari {formatRupiah(inv.total)}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <Badge tone={status.tone}>{status.label}</Badge>
                    {inv.balance > 0 ? <span className="tabular text-sm font-semibold">{formatRupiah(inv.balance)}</span> : null}
                  </span>
                  <CaretRightIcon size={18} weight="bold" className="shrink-0 text-ink-muted" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
