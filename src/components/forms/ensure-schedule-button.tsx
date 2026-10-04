'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ensureScheduleWindow, type SessionMutationState } from '@/app/(app)/sessions/actions';

const initialState: SessionMutationState = {};

export default function EnsureScheduleButton() {
  const [state, action, pending] = useActionState(ensureScheduleWindow, initialState);
  const router = useRouter();
  useEffect(() => { if (state.success) router.refresh(); }, [router, state.success]);
  return <form action={action}><button className="button button-quiet" type="submit" disabled={pending}>{pending ? 'Memperbarui…' : 'Perbarui jadwal 60 hari'}</button>{state.error && <p className="notice" role="alert" style={{ marginTop: 10 }}>{state.error}</p>}</form>;
}
