'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { recordPayment, type InvoiceActionState } from '@/app/(app)/invoices/actions';

const initialState: InvoiceActionState = {};

export default function PaymentForm({ invoiceId, balance, requestKey, timezone }: { invoiceId: string; balance: number; requestKey: string; timezone: string }) {
  const [state, action, pending] = useActionState(recordPayment, initialState);
  const router = useRouter();
  useEffect(() => { if (state.success) router.refresh(); }, [router, state.success]);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: timezone });
  return <form action={action}>
    <input type="hidden" name="invoiceId" value={invoiceId} />
    <input type="hidden" name="requestKey" value={requestKey} />
    <div className="form-grid">
      <div className="field"><label htmlFor="amount">Nominal diterima (Rp) *</label><input id="amount" name="amount" type="number" min="1" max={Math.min(balance, 100000000)} step="1" required inputMode="numeric" placeholder="Nominal yang diterima" /></div>
      <div className="field"><label htmlFor="receivedOn">Tanggal diterima *</label><input id="receivedOn" name="receivedOn" type="date" max={today} defaultValue={today} required /></div>
      <div className="field"><label htmlFor="method">Metode *</label><select id="method" name="method" defaultValue="transfer"><option value="transfer">Transfer</option><option value="cash">Tunai</option></select></div>
    </div>
    {state.error && <p className="notice" role="alert" style={{ marginTop: 16 }}>{state.error}</p>}
    <div className="form-actions"><button className="button" type="button" onClick={() => { const amount = document.getElementById('amount') as HTMLInputElement; amount.value = String(balance); }}>Bayar seluruh sisa</button><button className="button button-primary" type="submit" disabled={pending}>{pending ? 'Mencatat…' : 'Catat pembayaran'}</button></div>
  </form>;
}
