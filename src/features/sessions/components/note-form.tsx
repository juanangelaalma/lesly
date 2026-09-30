"use client";

import { useActionState, useState } from "react";
import { ChoiceGroup, Field, Input, Textarea } from "@/components/ui/field";
import { FormAlert, fieldErrors } from "@/components/ui/form-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { idle, type FormState } from "@/lib/action-result";
import { UNDERSTANDING_LABEL } from "@/features/reports/templates";
import { completeSession, updateSessionNote } from "../actions";

type Props = {
  mode: "complete" | "edit";
  sessionId: string;
  version: number;
  requestKey?: string;
  topics: string[];
  defaults?: { topic: string; understanding: string; note: string };
  /** Present when the session has not started yet, so the tutor must record the actual time. */
  startsInFuture?: boolean;
  localStart: { date: string; time: string };
};

const DESCRIPTIONS = {
  independent: "Bisa mengerjakan sendiri",
  assisted: "Bisa dengan bantuan",
  repeat: "Materi perlu diulang",
} as const;

export function NoteForm({ mode, sessionId, version, requestKey, topics, defaults, startsInFuture, localStart }: Props) {
  const [state, action] = useActionState<FormState, FormData>(mode === "complete" ? completeSession : updateSessionNote, idle);
  const [note, setNote] = useState(defaults?.note ?? "");
  const [adjust, setAdjust] = useState(Boolean(startsInFuture));
  const err = (name: string) => fieldErrors(state, name);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormAlert state={state} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="version" value={version} />
      {requestKey ? <input type="hidden" name="requestKey" value={requestKey} /> : null}

      <Field label="Materi hari ini" htmlFor="topic" errors={err("topic")} hint="Pilih dari riwayat atau ketik baru.">
        <Input
          id="topic"
          name="topic"
          list="topic-options"
          defaultValue={defaults?.topic}
          required
          maxLength={120}
          autoComplete="off"
          placeholder="Pecahan campuran"
          invalid={!!err("topic")}
        />
        <datalist id="topic-options">
          {topics.map((topic) => (
            <option key={topic} value={topic} />
          ))}
        </datalist>
      </Field>

      <ChoiceGroup
        name="understanding"
        legend="Pemahaman"
        defaultValue={defaults?.understanding}
        errors={err("understanding")}
        options={(["independent", "assisted", "repeat"] as const).map((value) => ({
          value,
          label: UNDERSTANDING_LABEL[value],
          description: DESCRIPTIONS[value],
        }))}
      />

      <Field
        label="Catatan singkat"
        htmlFor="note"
        optional
        errors={err("note")}
        hint={<span className="tabular">{note.length}/300</span>}
      >
        <Textarea
          id="note"
          name="note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={300}
          rows={3}
          placeholder="Sudah lancar penjumlahan, besok latihan soal cerita."
          invalid={!!err("note")}
        />
      </Field>

      {mode === "complete" ? (
        <div className="flex flex-col gap-3 rounded-[var(--radius-control)] border-2 border-line bg-surface-alt/60 p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="adjustTime"
              checked={adjust}
              onChange={(event) => setAdjust(event.target.checked)}
              className="mt-1 size-5 accent-teal-deep"
            />
            <span>
              <span className="block font-label font-bold">Jam sesi berbeda dari jadwal</span>
              <span className="block text-sm text-ink-muted">
                {startsInFuture ? "Sesi ini belum dimulai menurut jadwal. Isi jam mulai sebenarnya." : "Centang jika sesi dimajukan atau diundur."}
              </span>
            </span>
          </label>
          {adjust ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tanggal" htmlFor="date">
                <Input id="date" name="date" type="date" defaultValue={localStart.date} required />
              </Field>
              <Field label="Jam mulai" htmlFor="time">
                <Input id="time" name="time" type="time" defaultValue={localStart.time} required />
              </Field>
            </div>
          ) : null}
        </div>
      ) : null}

      <SubmitButton pendingLabel="Menyimpan">{mode === "complete" ? "Selesai dan buat laporan" : "Simpan catatan"}</SubmitButton>
    </form>
  );
}
