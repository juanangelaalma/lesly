"use client";

import { useActionState } from "react";
import { ChoiceGroup, Field, Input, Textarea } from "@/components/ui/field";
import { FormAlert, fieldErrors } from "@/components/ui/form-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, SectionTitle } from "@/components/ui/card";
import { idle, type FormState } from "@/lib/action-result";
import { createStudent, updateStudent } from "../actions";

type StudentDefaults = {
  name: string;
  grade: string;
  subject: string;
  address: string;
  guardianName: string;
  guardianPhone: string;
  notes: string;
};

type Props =
  | { mode: "create"; requestKey: string; defaultEffectiveFrom: string }
  | { mode: "edit"; studentId: string; version: number; defaults: StudentDefaults };

export function StudentForm(props: Props) {
  const [state, action] = useActionState<FormState, FormData>(
    props.mode === "create" ? createStudent : updateStudent,
    idle,
  );
  const d = props.mode === "edit" ? props.defaults : undefined;
  const err = (name: string) => fieldErrors(state, name);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormAlert state={state} />
      {props.mode === "create" ? (
        <input type="hidden" name="requestKey" value={props.requestKey} />
      ) : (
        <>
          <input type="hidden" name="studentId" value={props.studentId} />
          <input type="hidden" name="version" value={props.version} />
        </>
      )}

      <Card className="flex flex-col gap-4">
        <SectionTitle>Data murid</SectionTitle>
        <Field label="Nama murid" htmlFor="name" errors={err("name")}>
          <Input id="name" name="name" defaultValue={d?.name} required maxLength={80} autoComplete="off" invalid={!!err("name")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kelas" htmlFor="grade" optional errors={err("grade")}>
            <Input id="grade" name="grade" defaultValue={d?.grade} maxLength={40} placeholder="SD 5" />
          </Field>
          <Field label="Mapel" htmlFor="subject" optional errors={err("subject")}>
            <Input id="subject" name="subject" defaultValue={d?.subject} maxLength={80} placeholder="Matematika" />
          </Field>
        </div>
        <Field label="Alamat" htmlFor="address" optional errors={err("address")}>
          <Input id="address" name="address" defaultValue={d?.address} maxLength={200} autoComplete="street-address" />
        </Field>
      </Card>

      <Card className="flex flex-col gap-4">
        <SectionTitle>Kontak orang tua</SectionTitle>
        <Field label="Nama orang tua/wali" htmlFor="guardianName" optional errors={err("guardianName")}>
          <Input id="guardianName" name="guardianName" defaultValue={d?.guardianName} maxLength={80} placeholder="Ibu Sari" />
        </Field>
        <Field
          label="Nomor WhatsApp"
          htmlFor="guardianPhone"
          optional
          errors={err("guardianPhone")}
          hint="Dipakai untuk membuka WhatsApp. Pesan tetap Anda kirim sendiri."
        >
          <Input
            id="guardianPhone"
            name="guardianPhone"
            type="tel"
            inputMode="tel"
            defaultValue={d?.guardianPhone}
            placeholder="0812-3456-7890"
            invalid={!!err("guardianPhone")}
          />
        </Field>
        <Field label="Catatan pribadi" htmlFor="notes" optional errors={err("notes")} hint="Tidak ikut terkirim ke orang tua.">
          <Textarea id="notes" name="notes" defaultValue={d?.notes} maxLength={500} rows={3} />
        </Field>
      </Card>

      {props.mode === "create" ? (
        <Card className="flex flex-col gap-4">
          <SectionTitle>Tarif</SectionTitle>
          <ChoiceGroup
            name="billingMode"
            legend="Model pembayaran"
            columns={2}
            errors={err("billingMode")}
            options={[
              { value: "monthly", label: "Bulanan", description: "Tetap per bulan, izin tidak mengurangi" },
              { value: "per_session", label: "Per sesi", description: "Hanya sesi selesai yang ditagih" },
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tarif (Rp)" htmlFor="amount" errors={err("amount")}>
              <Input id="amount" name="amount" inputMode="numeric" placeholder="400.000" required invalid={!!err("amount")} className="tabular" />
            </Field>
            <Field label="Berlaku mulai" htmlFor="effectiveFrom" errors={err("effectiveFrom")}>
              <Input id="effectiveFrom" name="effectiveFrom" type="date" defaultValue={props.defaultEffectiveFrom} required />
            </Field>
          </div>
        </Card>
      ) : null}

      <SubmitButton>{props.mode === "create" ? "Simpan murid" : "Simpan perubahan"}</SubmitButton>
    </form>
  );
}
