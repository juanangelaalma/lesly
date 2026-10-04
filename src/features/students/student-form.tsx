"use client";

import { ArrowRight, LoaderCircle, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { FormFeedback } from "@/components/form-feedback";
import { saveStudentAction } from "@/features/students/actions";
import { initialFormState } from "@/lib/action-state";
import { jakartaDateInputValue } from "@/lib/format";
import type { BillingMode } from "@/types/database";

export type StudentDraft = {
  id: string;
  version: number;
  name: string;
  grade: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  addressHint: string | null;
  startsOn: string;
  mode: BillingMode;
  rateRupiah: number;
  dueDay: number;
};

export function StudentForm({
  student,
  requestKey,
}: {
  student?: StudentDraft;
  requestKey: string;
}) {
  const router = useRouter();

  const [state, formAction, isPending] = useActionState(
    saveStudentAction,
    initialFormState,
  );

  const today = jakartaDateInputValue();

  useEffect(() => {
    if (state.status === "success" && state.redirectTo) {
      router.push(state.redirectTo);
      router.refresh();
    }
  }, [router, state]);

  return (
    <form action={formAction} className="form-card card">
      <input name="requestKey" type="hidden" value={requestKey} />
      <input name="studentId" type="hidden" value={student?.id ?? ""} />
      <input
        name="expectedVersion"
        type="hidden"
        value={student?.version ?? ""}
      />
      <div className="form-grid">
        <div className="form-section-title">Tentang murid</div>
        <div className="field">
          <label htmlFor="name">Nama murid</label>
          <input
            autoComplete="off"
            className="input"
            defaultValue={student?.name ?? ""}
            id="name"
            maxLength={80}
            name="name"
            placeholder="Contoh: Alya"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="grade">Kelas</label>
          <input
            className="input"
            defaultValue={student?.grade ?? ""}
            id="grade"
            maxLength={50}
            name="grade"
            placeholder="Contoh: Kelas 5 SD"
          />
        </div>
        <div className="field">
          <label htmlFor="guardianName">Nama orang tua</label>
          <input
            autoComplete="name"
            className="input"
            defaultValue={student?.guardianName ?? ""}
            id="guardianName"
            maxLength={80}
            name="guardianName"
          />
        </div>
        <div className="field">
          <label htmlFor="guardianPhone">
            WhatsApp orang tua <span className="muted-copy">(opsional)</span>
          </label>
          <input
            autoComplete="tel"
            className="input"
            defaultValue={student?.guardianPhone ?? ""}
            id="guardianPhone"
            inputMode="tel"
            maxLength={32}
            name="guardianPhone"
            placeholder="0812…"
          />
          <p className="field-hint">
            Nomor dinormalisasi ke format internasional. Nomor ini tidak tampil
            di daftar murid.
          </p>
        </div>
        <div className="field field-full">
          <label htmlFor="addressHint">
            Patokan lokasi <span className="muted-copy">(opsional)</span>
          </label>
          <input
            className="input"
            defaultValue={student?.addressHint ?? ""}
            id="addressHint"
            maxLength={120}
            name="addressHint"
            placeholder="Contoh: dekat taman kota"
          />
        </div>
        <div className="field">
          <label htmlFor="startsOn">Mulai belajar</label>
          <input
            className="input"
            defaultValue={student?.startsOn ?? today}
            id="startsOn"
            name="startsOn"
            required
            type="date"
          />
        </div>

        <hr className="form-divider" />
        <div className="form-section-title">Tarif belajar</div>
        <div className="field">
          <label htmlFor="billingMode">Model tarif</label>
          <select
            className="select"
            defaultValue={student?.mode ?? "monthly"}
            id="billingMode"
            name="billingMode"
          >
            <option value="monthly">Bulanan</option>
            <option value="per_session">Per sesi selesai</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="rateRupiah">Nominal (Rupiah)</label>
          <input
            className="input"
            defaultValue={student?.rateRupiah ?? ""}
            id="rateRupiah"
            inputMode="numeric"
            max={100000000}
            min={1}
            name="rateRupiah"
            placeholder="400000"
            required
            type="number"
          />
        </div>
        <div className="field">
          <label htmlFor="dueDay">Jatuh tempo bulanan</label>
          <input
            className="input"
            defaultValue={student?.dueDay ?? 5}
            id="dueDay"
            max={28}
            min={1}
            name="dueDay"
            required
            type="number"
          />
          <p className="field-hint">
            Tanggal 1 sampai 28. Default-nya tanggal 5.
          </p>
        </div>
        <div className="field">
          <label htmlFor="effectiveMonth">Tarif berlaku mulai</label>
          <input
            className="input"
            defaultValue=""
            id="effectiveMonth"
            name="effectiveMonth"
            type="month"
          />
          <p className="field-hint">
            {student
              ? "Kosongkan agar tarif tetap. Perubahan berlaku mulai bulan yang dipilih."
              : "Tarif awal mengikuti bulan mulai belajar."}
          </p>
        </div>
      </div>
      <FormFeedback state={state} />
      <div className="form-actions">
        <Link
          className="button button-secondary"
          href={student ? `/students/${student.id}` : "/students"}
        >
          Batal
        </Link>
        <button className="button" disabled={isPending} type="submit">
          {isPending ? (
            <LoaderCircle aria-hidden="true" className="spin-icon" size={18} />
          ) : student ? (
            <Save aria-hidden="true" size={18} />
          ) : (
            <ArrowRight aria-hidden="true" size={18} />
          )}
          {isPending
            ? "Menyimpan…"
            : student
              ? "Simpan perubahan"
              : "Simpan murid"}
        </button>
      </div>
    </form>
  );
}
