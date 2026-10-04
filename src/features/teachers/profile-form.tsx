"use client";

import { LoaderCircle, Save } from "lucide-react";
import { useActionState } from "react";

import { FormFeedback } from "@/components/form-feedback";
import { saveTeacherProfileAction } from "@/features/teachers/actions";
import { initialFormState } from "@/lib/action-state";

export function TeacherProfileForm({
  displayName = "",
  timezone = "Asia/Jakarta",
  submitLabel = "Simpan profil",
  returnTo = "/today",
}: {
  displayName?: string;
  timezone?: string;
  submitLabel?: string;
  returnTo?: "/today" | "/settings";
}) {
  const [state, formAction, isPending] = useActionState(
    saveTeacherProfileAction,
    initialFormState,
  );

  return (
    <form action={formAction} className="form-card card">
      <input name="nextPath" type="hidden" value={returnTo} />
      <div className="form-grid">
        <div className="field field-full">
          <label htmlFor="displayName">Nama yang ingin ditampilkan</label>
          <input
            autoComplete="name"
            className="input"
            defaultValue={displayName}
            id="displayName"
            maxLength={80}
            name="displayName"
            required
          />
        </div>
        <div className="field field-full">
          <label htmlFor="timezone">Zona waktu</label>
          <select
            className="select"
            defaultValue={timezone}
            id="timezone"
            name="timezone"
          >
            <option value="Asia/Jakarta">WIB · Jakarta</option>
            <option value="Asia/Pontianak">WIB · Pontianak</option>
            <option value="Asia/Makassar">WITA · Makassar</option>
            <option value="Asia/Jayapura">WIT · Jayapura</option>
          </select>
          <p className="field-hint">
            Tanggal dan waktu kegiatan mengikuti zona ini.
          </p>
        </div>
      </div>
      <FormFeedback state={state} />
      <div className="form-actions">
        <button className="button" disabled={isPending} type="submit">
          {isPending ? (
            <LoaderCircle aria-hidden="true" className="spin-icon" size={18} />
          ) : (
            <Save aria-hidden="true" size={18} />
          )}
          {isPending ? "Menyimpan…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
