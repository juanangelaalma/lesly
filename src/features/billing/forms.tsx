"use client";

import { Clipboard, LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { FormFeedback } from "@/components/form-feedback";
import {
  addInvoiceAdjustmentAction,
  ensureInvoicesAction,
  recordPaymentAction,
  voidPaymentAction,
} from "@/features/billing/actions";
import { initialFormState, type FormState } from "@/lib/action-state";

function useRefreshAfterSuccess(state: FormState) {
  const router = useRouter();
  useEffect(() => {
    if (state.status === "success") {
      if (state.redirectTo) router.push(state.redirectTo);
      router.refresh();
    }
  }, [router, state]);
}

export function EnsureInvoicesForm({
  initialPeriod,
}: {
  initialPeriod: string;
}) {
  const [state, action, pending] = useActionState(
    ensureInvoicesAction,
    initialFormState,
  );

  useRefreshAfterSuccess(state);

  return (
    <form action={action} className="inline-action-form invoice-period-form">
      <label className="visually-hidden" htmlFor="invoicePeriod">
        Periode tagihan
      </label>
      <input
        className="input input-compact"
        defaultValue={initialPeriod}
        id="invoicePeriod"
        name="period"
        type="month"
      />
      <button
        className="button button-secondary button-small"
        disabled={pending}
      >
        {pending ? <LoaderCircle className="spin-icon" size={17} /> : null}
        {pending ? "Memperbarui…" : "Tampilkan tagihan"}
      </button>
      <FormFeedback state={state} />
    </form>
  );
}

export function RecordPaymentForm({
  invoiceId,
  today,
  remaining,
  requestKey,
}: {
  invoiceId: string;
  today: string;
  remaining: number;
  requestKey: string;
}) {
  const [state, action, pending] = useActionState(
    recordPaymentAction,
    initialFormState,
  );

  useRefreshAfterSuccess(state);

  if (remaining <= 0) return null;

  return (
    <form action={action} className="form-card card">
      <input name="invoiceId" type="hidden" value={invoiceId} />
      <input name="requestKey" type="hidden" value={requestKey} />
      <div className="form-grid">
        <div className="field field-full">
          <label htmlFor="amountRupiah">Nominal diterima</label>
          <input
            className="input"
            defaultValue={remaining}
            id="amountRupiah"
            inputMode="numeric"
            max={remaining}
            min="1"
            name="amountRupiah"
            required
            type="number"
          />
          <p className="field-hint">
            Sisa saat ini {new Intl.NumberFormat("id-ID").format(remaining)}{" "}
            rupiah.
          </p>
        </div>
        <div className="field">
          <label htmlFor="receivedOn">Tanggal diterima</label>
          <input
            className="input"
            defaultValue={today}
            id="receivedOn"
            max={today}
            name="receivedOn"
            required
            type="date"
          />
        </div>
        <div className="field">
          <label htmlFor="paymentMethod">Metode</label>
          <select
            className="select"
            defaultValue="bank_transfer"
            id="paymentMethod"
            name="method"
          >
            <option value="bank_transfer">Transfer</option>
            <option value="cash">Tunai</option>
          </select>
        </div>
      </div>
      <FormFeedback state={state} />
      <div className="form-actions">
        <button className="button" disabled={pending}>
          {pending ? (
            <LoaderCircle className="spin-icon" size={18} />
          ) : (
            <Save size={18} />
          )}
          {pending ? "Menyimpan…" : "Catat pembayaran"}
        </button>
      </div>
    </form>
  );
}

export function VoidPaymentForm({
  invoiceId,
  paymentId,
  requestKey,
}: {
  invoiceId: string;
  paymentId: string;
  requestKey: string;
}) {
  const [state, action, pending] = useActionState(
    voidPaymentAction,
    initialFormState,
  );

  useRefreshAfterSuccess(state);

  return (
    <form action={action} className="void-payment-form">
      <input name="invoiceId" type="hidden" value={invoiceId} />
      <input name="paymentId" type="hidden" value={paymentId} />
      <input name="requestKey" type="hidden" value={requestKey} />
      <label className="field-label" htmlFor={"void-reason-" + paymentId}>
        Alasan pembatalan
      </label>
      <input
        className="input input-compact"
        id={"void-reason-" + paymentId}
        maxLength={300}
        name="reason"
        required
      />
      <button className="button button-danger button-small" disabled={pending}>
        {pending ? "Menyimpan…" : "Batalkan catatan"}
      </button>
      <FormFeedback state={state} />
    </form>
  );
}

export function InvoiceAdjustmentForm({
  invoiceId,
  requestKey,
}: {
  invoiceId: string;
  requestKey: string;
}) {
  const [state, action, pending] = useActionState(
    addInvoiceAdjustmentAction,
    initialFormState,
  );

  useRefreshAfterSuccess(state);

  return (
    <form action={action} className="form-card card">
      <input name="invoiceId" type="hidden" value={invoiceId} />
      <input name="requestKey" type="hidden" value={requestKey} />
      <div className="form-grid">
        <div className="field">
          <label htmlFor="adjustmentKind">Jenis</label>
          <select
            className="select"
            defaultValue="adjustment"
            id="adjustmentKind"
            name="kind"
          >
            <option value="adjustment">Penyesuaian</option>
            <option value="opening_balance">Saldo awal</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="amountSigned">Nominal (+ / − rupiah)</label>
          <input
            className="input"
            id="amountSigned"
            inputMode="numeric"
            max="100000000"
            min="-100000000"
            name="amountSigned"
            required
            type="number"
          />
        </div>
        <div className="field field-full">
          <label htmlFor="adjustmentDescription">Keterangan</label>
          <input
            className="input"
            id="adjustmentDescription"
            maxLength={120}
            name="description"
            required
          />
        </div>
        <div className="field field-full">
          <label htmlFor="adjustmentReason">Alasan</label>
          <textarea
            className="textarea"
            id="adjustmentReason"
            maxLength={300}
            name="reason"
            required
          />
        </div>
      </div>
      <FormFeedback state={state} />
      <div className="form-actions">
        <button className="button button-secondary" disabled={pending}>
          {pending ? (
            <LoaderCircle className="spin-icon" size={18} />
          ) : (
            <Save size={18} />
          )}
          {pending ? "Menyimpan…" : "Simpan penyesuaian"}
        </button>
      </div>
    </form>
  );
}

export function CopyReportButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setFailed(false);
    } catch {
      setCopied(false);
      setFailed(true);
    }
  }

  return (
    <>
      <button
        className="button button-secondary"
        onClick={copyReport}
        type="button"
      >
        <Clipboard size={17} />
        {copied ? "Teks tersalin" : "Salin teks"}
      </button>
      {failed ? (
        <p className="form-feedback" role="status">
          Salin manual teks yang tampil pada pratinjau.
        </p>
      ) : null}
    </>
  );
}
