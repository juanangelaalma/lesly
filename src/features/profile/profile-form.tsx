"use client";

import { useActionState } from "react";
import { Field, Input, Select } from "@/components/ui/field";
import { FormAlert, fieldErrors } from "@/components/ui/form-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { idle, type FormState } from "@/lib/action-result";
import { TIMEZONES } from "@/lib/dates";
import { saveProfile } from "@/features/auth/actions";

type Props = {
  intent: "onboarding" | "settings";
  defaults: { displayName: string; phone: string; timezone: string; reportSignature: string };
};

export function ProfileForm({ intent, defaults }: Props) {
  const [state, action] = useActionState<FormState, FormData>(saveProfile, idle);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormAlert state={state} />
      <input type="hidden" name="intent" value={intent} />
      <Field label="Nama yang tampil di laporan" htmlFor="displayName" errors={fieldErrors(state, "displayName")}>
        <Input id="displayName" name="displayName" defaultValue={defaults.displayName} autoComplete="name" required maxLength={80} placeholder="Kak Dinda" />
      </Field>
      <Field label="Nomor HP" htmlFor="phone" optional errors={fieldErrors(state, "phone")} hint="Contoh: 0812-3456-7890">
        <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={defaults.phone} />
      </Field>
      <Field label="Zona waktu" htmlFor="timezone" errors={fieldErrors(state, "timezone")}>
        <Select id="timezone" name="timezone" defaultValue={defaults.timezone}>
          {Object.entries(TIMEZONES).map(([value, { label }]) => (
            <option key={value} value={value}>
              {label} ({value.replace("Asia/", "")})
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Penutup pesan"
        htmlFor="reportSignature"
        optional
        errors={fieldErrors(state, "reportSignature")}
        hint="Muncul di akhir laporan dan pengingat tagihan."
      >
        <Input id="reportSignature" name="reportSignature" defaultValue={defaults.reportSignature} maxLength={120} placeholder="Salam, Kak Dinda" />
      </Field>
      <SubmitButton>{intent === "onboarding" ? "Lanjut tambah murid" : "Simpan profil"}</SubmitButton>
    </form>
  );
}
