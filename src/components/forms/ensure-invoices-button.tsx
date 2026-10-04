'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ensureInvoices, type InvoiceActionState } from '@/app/(app)/invoices/actions';

const initialState: InvoiceActionState = {};

export default function EnsureInvoicesButton() {
  const [state, action, pending] = useActionState(ensureInvoices, initialState);
  const router = useRouter();
  useEffect(() => { if (state.success) router.refresh(); }, [router, state.success]);
  return <form action={action}><button className="button button-primary" type="submit" disabled={pending}>{pending ? 'Menyiapkan…' : 'Siapkan tagihan bulan ini'}</button>{state.error && <p className="notice" role="alert" style={{ marginTop: 12 }}>{state.error}</p>}</form>;
}
