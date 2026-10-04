"use client";

import { ArrowRight, CalendarClock, LoaderCircle, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { FormFeedback } from "@/components/form-feedback";
import {
  createAdhocSessionAction,
  createScheduleRuleAction,
  endScheduleRuleAction,
  ensureScheduleWindowAction,
} from "@/features/scheduling/actions";
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

export function EnsureScheduleWindowForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(
    ensureScheduleWindowAction,
    initialFormState,
  );

  useRefreshAfterSuccess(state);

  return (
    <form action={action} className="inline-action-form">
      <input name="from" type="hidden" value={today} />
      <button
        className="button button-secondary button-small"
        disabled={pending}
      >
        {pending ? (
          <LoaderCircle className="spin-icon" size={17} />
        ) : (
          <CalendarClock size={17} />
        )}
        {pending ? "Memuat agenda…" : "Perbarui agenda"}
      </button>
      <FormFeedback state={state} />
    </form>
  );
}

export function ScheduleRuleForm({
  studentId,
  effectiveFrom,
}: {
  studentId: string;
  effectiveFrom: string;
}) {
  const [state, action, pending] = useActionState(
    createScheduleRuleAction,
    initialFormState,
  );

  useRefreshAfterSuccess(state);

  return (
    <form action={action} className="form-card card">
      <input name="studentId" type="hidden" value={studentId} />
      <div className="form-grid">
        <div className="field">
          <label htmlFor="weekday">Hari</label>
          <select
            className="select"
            defaultValue="1"
            id="weekday"
            name="weekday"
          >
            <option value="1">Senin</option>
            <option value="2">Selasa</option>
            <option value="3">Rabu</option>
            <option value="4">Kamis</option>
            <option value="5">Jumat</option>
            <option value="6">Sabtu</option>
            <option value="7">Minggu</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="localStart">Jam mulai</label>
          <input
            className="input"
            id="localStart"
            name="localStart"
            required
            type="time"
            defaultValue="15:00"
          />
        </div>
        <div className="field">
          <label htmlFor="durationMinutes">Durasi (menit)</label>
          <input
            className="input"
            defaultValue="60"
            id="durationMinutes"
            max="240"
            min="15"
            name="durationMinutes"
            required
            type="number"
          />
        </div>
        <div className="field">
          <label htmlFor="effectiveFrom">Mulai berlaku</label>
          <input
            className="input"
            defaultValue={effectiveFrom}
            id="effectiveFrom"
            name="effectiveFrom"
            required
            type="date"
          />
        </div>
        <div className="field field-full">
          <label htmlFor="effectiveUntil">Berakhir (opsional)</label>
          <input
            className="input"
            id="effectiveUntil"
            name="effectiveUntil"
            type="date"
          />
          <p className="field-hint">
            Sesi yang sudah dijadwalkan tetap ada sampai dihentikan dengan
            tanggal efektif.
          </p>
        </div>
      </div>
      <FormFeedback state={state} />
      <div className="form-actions">
        <Link
          className="button button-secondary"
          href={"/students/" + studentId}
        >
          Batal
        </Link>
        <button className="button" disabled={pending}>
          {pending ? (
            <LoaderCircle className="spin-icon" size={18} />
          ) : (
            <Save size={18} />
          )}
          {pending ? "Menyimpan…" : "Simpan jadwal"}
        </button>
      </div>
    </form>
  );
}

export function EndScheduleRuleForm({
  ruleId,
  effectiveFrom,
  today,
}: {
  ruleId: string;
  effectiveFrom: string;
  today: string;
}) {
  const [state, action, pending] = useActionState(
    endScheduleRuleAction,
    initialFormState,
  );

  useRefreshAfterSuccess(state);
  const inputId = "end-" + ruleId;

  return (
    <form action={action} className="end-rule-form">
      <input name="ruleId" type="hidden" value={ruleId} />
      <label className="field-label" htmlFor={inputId}>
        Hentikan mulai
      </label>
      <input
        className="input input-compact"
        defaultValue={effectiveFrom > today ? effectiveFrom : today}
        id={inputId}
        min={effectiveFrom}
        name="effectiveUntil"
        required
        type="date"
      />
      <button
        className="button button-secondary button-small"
        disabled={pending}
      >
        {pending ? "Menyimpan…" : "Perbarui"}
      </button>
      <FormFeedback state={state} />
    </form>
  );
}

export function AdhocSessionForm({
  studentId,
  startsAt,
  endsAt,
}: {
  studentId: string;
  startsAt: string;
  endsAt: string;
}) {
  const [state, action, pending] = useActionState(
    createAdhocSessionAction,
    initialFormState,
  );

  useRefreshAfterSuccess(state);

  return (
    <form action={action} className="form-card card">
      <input name="studentId" type="hidden" value={studentId} />
      <div className="form-grid">
        <div className="field field-full">
          <label htmlFor="startsAt">Mulai</label>
          <input
            className="input"
            defaultValue={startsAt}
            id="startsAt"
            name="startsAt"
            required
            type="datetime-local"
          />
        </div>
        <div className="field field-full">
          <label htmlFor="endsAt">Selesai</label>
          <input
            className="input"
            defaultValue={endsAt}
            id="endsAt"
            name="endsAt"
            required
            type="datetime-local"
          />
          <p className="field-hint">
            Sesi satu kali tidak mengubah jadwal mingguan.
          </p>
        </div>
      </div>
      <FormFeedback state={state} />
      <div className="form-actions">
        <Link
          className="button button-secondary"
          href={"/students/" + studentId}
        >
          Batal
        </Link>
        <button className="button" disabled={pending}>
          {pending ? (
            <LoaderCircle className="spin-icon" size={18} />
          ) : (
            <ArrowRight size={18} />
          )}
          {pending ? "Menyimpan…" : "Simpan sesi"}
        </button>
      </div>
    </form>
  );
}
