"use client";

import { LoaderCircle, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { FormFeedback } from "@/components/form-feedback";
import {
  completeSessionAction,
  reopenSessionAction,
  updateSessionNoteAction,
} from "@/features/sessions/actions";
import {
  rescheduleSessionAction,
  setSessionNonbillableAction,
} from "@/features/scheduling/actions";
import { initialFormState, type FormState } from "@/lib/action-state";
import type { SessionState } from "@/types/database";

function useRefreshAfterSuccess(state: FormState) {
  const router = useRouter();
  useEffect(() => {
    if (state.status === "success") {
      if (state.redirectTo) router.push(state.redirectTo);
      router.refresh();
    }
  }, [router, state]);
}

export function CompleteSessionForm({
  sessionId,
  expectedVersion,
  requestKey,
}: {
  sessionId: string;
  expectedVersion: number;
  requestKey: string;
}) {
  const [state, action, pending] = useActionState(
    completeSessionAction,
    initialFormState,
  );

  useRefreshAfterSuccess(state);

  return (
    <form action={action} className="form-card card">
      <input name="sessionId" type="hidden" value={sessionId} />
      <input name="expectedVersion" type="hidden" value={expectedVersion} />
      <input name="requestKey" type="hidden" value={requestKey} />
      <div className="form-grid">
        <div className="field field-full">
          <label htmlFor="topicName">Materi atau topik</label>
          <input
            className="input"
            id="topicName"
            maxLength={120}
            name="topicName"
            placeholder="Contoh: perkalian dua angka"
            required
          />
        </div>
        <fieldset className="understanding-field field-full">
          <legend>Pemahaman hari ini</legend>
          <label>
            <input
              defaultChecked
              name="understanding"
              type="radio"
              value="independent"
            />{" "}
            Mandiri
          </label>
          <label>
            <input name="understanding" type="radio" value="assisted" /> Masih
            perlu bantuan
          </label>
          <label>
            <input name="understanding" type="radio" value="repeat" /> Perlu
            diulang
          </label>
        </fieldset>
        <div className="field field-full">
          <label htmlFor="note">
            Catatan atau latihan berikutnya{" "}
            <span className="muted-copy">(opsional)</span>
          </label>
          <textarea
            className="textarea"
            id="note"
            maxLength={300}
            name="note"
            placeholder="Bagian yang sudah lancar atau perlu dicoba lagi"
          />
        </div>
      </div>
      <FormFeedback state={state} />
      <div className="form-actions">
        <Link
          className="button button-secondary"
          href={"/sessions/" + sessionId}
        >
          Batal
        </Link>
        <button className="button" disabled={pending}>
          {pending ? (
            <LoaderCircle className="spin-icon" size={18} />
          ) : (
            <Save size={18} />
          )}
          {pending ? "Menyimpan…" : "Simpan catatan"}
        </button>
      </div>
    </form>
  );
}

export function RescheduleSessionForm({
  sessionId,
  version,
  startsAt,
  endsAt,
}: {
  sessionId: string;
  version: number;
  startsAt: string;
  endsAt: string;
}) {
  const [state, action, pending] = useActionState(
    rescheduleSessionAction,
    initialFormState,
  );

  useRefreshAfterSuccess(state);

  return (
    <form action={action} className="form-card card">
      <input name="sessionId" type="hidden" value={sessionId} />
      <input name="expectedVersion" type="hidden" value={version} />
      <div className="form-grid">
        <div className="field field-full">
          <label htmlFor="newStartsAt">Mulai</label>
          <input
            className="input"
            defaultValue={startsAt}
            id="newStartsAt"
            name="startsAt"
            required
            type="datetime-local"
          />
        </div>
        <div className="field field-full">
          <label htmlFor="newEndsAt">Selesai</label>
          <input
            className="input"
            defaultValue={endsAt}
            id="newEndsAt"
            name="endsAt"
            required
            type="datetime-local"
          />
        </div>
      </div>
      <p className="field-hint">
        Sesi mempertahankan ID yang sama. Sesi rutin lain tidak berubah.
      </p>
      <FormFeedback state={state} />
      <div className="form-actions">
        <Link
          className="button button-secondary"
          href={"/sessions/" + sessionId}
        >
          Batal
        </Link>
        <button className="button" disabled={pending}>
          {pending ? (
            <LoaderCircle className="spin-icon" size={18} />
          ) : (
            <Save size={18} />
          )}
          {pending ? "Menyimpan…" : "Simpan waktu baru"}
        </button>
      </div>
    </form>
  );
}

export function NonbillableSessionForm({
  sessionId,
  version,
}: {
  sessionId: string;
  version: number;
}) {
  const [state, action, pending] = useActionState(
    setSessionNonbillableAction,
    initialFormState,
  );

  useRefreshAfterSuccess(state);

  return (
    <form action={action} className="form-card card action-card">
      <input name="sessionId" type="hidden" value={sessionId} />
      <input name="expectedVersion" type="hidden" value={version} />
      <div className="field">
        <label htmlFor="nonbillableState">Status sesi</label>
        <select
          className="select"
          defaultValue="student_absent"
          id="nonbillableState"
          name="state"
        >
          <option value="student_absent">Murid izin / tidak hadir</option>
          <option value="teacher_cancelled">Dibatalkan guru</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="nonbillableReason">Catatan singkat</label>
        <input
          className="input"
          id="nonbillableReason"
          maxLength={300}
          name="reason"
          placeholder="Contoh: izin keluarga"
          required
        />
      </div>
      <FormFeedback state={state} />
      <button className="button button-secondary" disabled={pending}>
        {pending ? "Menyimpan…" : "Simpan status"}
      </button>
    </form>
  );
}

export function UpdateSessionNoteForm({
  note,
  sessionId,
  topicName,
}: {
  note: {
    id: string;
    version: number;
    understanding: "independent" | "assisted" | "repeat";
    note: string | null;
  };
  sessionId: string;
  topicName: string;
}) {
  const [state, action, pending] = useActionState(
    updateSessionNoteAction,
    initialFormState,
  );

  useRefreshAfterSuccess(state);

  return (
    <form action={action} className="form-card card">
      <input name="noteId" type="hidden" value={note.id} />
      <input name="sessionId" type="hidden" value={sessionId} />
      <input name="expectedVersion" type="hidden" value={note.version} />
      <div className="form-grid">
        <div className="field field-full">
          <label htmlFor="editTopicName">Materi</label>
          <input
            className="input"
            defaultValue={topicName}
            id="editTopicName"
            maxLength={120}
            name="topicName"
            required
          />
        </div>
        <fieldset className="understanding-field field-full">
          <legend>Pemahaman</legend>
          <label>
            <input
              defaultChecked={note.understanding === "independent"}
              name="understanding"
              type="radio"
              value="independent"
            />{" "}
            Mandiri
          </label>
          <label>
            <input
              defaultChecked={note.understanding === "assisted"}
              name="understanding"
              type="radio"
              value="assisted"
            />{" "}
            Masih perlu bantuan
          </label>
          <label>
            <input
              defaultChecked={note.understanding === "repeat"}
              name="understanding"
              type="radio"
              value="repeat"
            />{" "}
            Perlu diulang
          </label>
        </fieldset>
        <div className="field field-full">
          <label htmlFor="editNote">Catatan</label>
          <textarea
            className="textarea"
            defaultValue={note.note ?? ""}
            id="editNote"
            maxLength={300}
            name="note"
          />
        </div>
        <div className="field field-full">
          <label htmlFor="editReason">Alasan koreksi</label>
          <input
            className="input"
            id="editReason"
            maxLength={300}
            name="reason"
            required
          />
          <p className="field-hint">Koreksi catatan tidak mengubah tagihan.</p>
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
          {pending ? "Menyimpan…" : "Simpan koreksi"}
        </button>
      </div>
    </form>
  );
}

export function ReopenSessionForm({
  sessionId,
  version,
  state,
}: {
  sessionId: string;
  version: number;
  state: SessionState;
}) {
  const [formState, action, pending] = useActionState(
    reopenSessionAction,
    initialFormState,
  );

  useRefreshAfterSuccess(formState);

  if (state !== "completed") return null;

  return (
    <form action={action} className="form-card card action-card">
      <input name="sessionId" type="hidden" value={sessionId} />
      <input name="expectedVersion" type="hidden" value={version} />
      <div className="field">
        <label htmlFor="reopenReason">Buka kembali sesi</label>
        <input
          className="input"
          id="reopenReason"
          maxLength={300}
          name="reason"
          placeholder="Alasan koreksi"
          required
        />
        <p className="field-hint">
          Biaya sesi dihapus dengan pemeriksaan sisa pembayaran. Catatan lama
          tetap tersimpan.
        </p>
      </div>
      <FormFeedback state={formState} />
      <button className="button button-secondary" disabled={pending}>
        {pending ? "Menyimpan…" : "Buka kembali"}
      </button>
    </form>
  );
}
