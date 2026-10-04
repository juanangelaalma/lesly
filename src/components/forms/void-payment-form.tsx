'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { voidPayment, type InvoiceActionState } from '@/app/(app)/invoices/actions';

const initialState: InvoiceActionState = {};

export default function VoidPaymentForm({ paymentId, invoiceId }: { paymentId: string; invoiceId: string }) {
  const [state, action, pending] = useActionState(voidPayment, initialState);
  const router = useRouter();
  useEffect(() => { if (state.success) router.refresh(); }, [router, state.success]);
  return <form action={action} style={{ marginTop: 12 }}><input type="hidden" name="paymentId" value={paymentId} /><input type="hidden" name="invoiceId" value={invoiceId} /><div className="field"><label htmlFor={`void-reason-${paymentId}`}>Alasan koreksi</label><input id={`void-reason-${paymentId}`} name="reason" maxLength={300} required placeholder="Mengapa catatan pembayaran dikoreksi?" /></div>{state.error && <p className="notice" role="alert" style={{ marginTop: 8 }}>{state.error}</p>}{state.success && <p role="status" style={{ marginTop: 8 }}>Pencatatan dibatalkan. Ini hanya mengoreksi catatan, bukan mengembalikan uang.</p>}<div className="form-actions"><button className="button button-quiet" type="submit" disabled={pending}>{pending ? 'Membatalkan…' : 'Batalkan pencatatan'}</button></div></form>;
}
