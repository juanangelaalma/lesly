"use client";

import { Archive, LoaderCircle } from "lucide-react";
import { useActionState } from "react";

import { FormFeedback } from "@/components/form-feedback";
import { archiveStudentAction } from "@/features/students/actions";
import { initialFormState } from "@/lib/action-state";

export function ArchiveStudentForm({ studentId }: { studentId: string }) {
  const [state, formAction, isPending] = useActionState(
    archiveStudentAction,
    initialFormState,
  );

  return (
    <form action={formAction} className="archive-form card card-pad">
      <input name="studentId" type="hidden" value={studentId} />
      <h2>Arsipkan murid</h2>
      <p className="muted-copy">
        Murid tidak lagi muncul di daftar aktif. Riwayat dan tagihan yang sudah
        tercatat tetap disimpan.
      </p>
      <label className="check-line">
        <input name="confirmation" required type="checkbox" />
        <span>Saya yakin ingin mengarsipkan murid ini.</span>
      </label>
      <FormFeedback state={state} />
      <button
        className="button button-danger button-small"
        disabled={isPending}
        type="submit"
      >
        {isPending ? (
          <LoaderCircle aria-hidden="true" className="spin-icon" size={17} />
        ) : (
          <Archive aria-hidden="true" size={17} />
        )}
        {isPending ? "Mengarsipkan…" : "Arsipkan murid"}
      </button>
    </form>
  );
}
