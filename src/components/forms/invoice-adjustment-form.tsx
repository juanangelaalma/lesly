'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { addInvoiceAdjustment, type InvoiceActionState } from '@/app/(app)/invoices/actions';

const initialState: InvoiceActionState = {};

export default function InvoiceAdjustmentForm({ invoiceId }: { invoiceId: string }) {
  const [state, action, pending] = useActionState(addInvoiceAdjustment, initialState);
  const router = useRouter();
  useEffect(() => { if (state.success) router.refresh(); }, [router, state.success]);
  return <form action={action}><input type="hidden" name="invoiceId" value={invoiceId} /><div className="form-grid"><div className="field"><label htmlFor="adjustment-amount">Penyesuaian (Rp) *</label><input id="adjustment-amount" name="amount" type="number" min="-100000000" max="100000000" step="1" required placeholder="Positif menambah, negatif mengurangi" /><p className="helper">Penyesuaian tidak boleh membuat tagihan di bawah jumlah yang sudah diterima.</p></div><div className="field"><label htmlFor="adjustment-description">Rincian yang terlihat *</label><input id="adjustment-description" name="description" maxLength={120} required placeholder="Contoh: Potongan yang disepakati" /></div><div className="field wide"><label htmlFor="adjustment-reason">Alasan koreksi *</label><textarea id="adjustment-reason" name="reason" maxLength={300} required placeholder="Catatan audit untuk perubahan tagihan" /></div></div>{state.error && <p className="notice" role="alert" style={{ marginTop: 16 }}>{state.error}</p>}{state.success && <p role="status" style={{ marginTop: 16 }}>Penyesuaian tagihan tersimpan.</p>}<div className="form-actions"><button className="button" type="submit" disabled={pending}>{pending ? 'Menyimpan…' : 'Simpan penyesuaian'}</button></div></form>;
}
