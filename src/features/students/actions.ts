"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/action-result";
import { fromDbError, fromZodError } from "@/lib/errors";
import { str } from "@/lib/form";
import { requestKey } from "@/lib/request-key";
import { planFields, studentFields } from "./schemas";

function readStudent(formData: FormData) {
  return {
    name: str(formData, "name"),
    grade: str(formData, "grade"),
    subject: str(formData, "subject"),
    address: str(formData, "address"),
    guardianName: str(formData, "guardianName"),
    guardianPhone: str(formData, "guardianPhone"),
    notes: str(formData, "notes"),
  };
}

export async function createStudent(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = studentFields.extend(planFields.shape).extend({ requestKey }).safeParse({
    ...readStudent(formData),
    billingMode: str(formData, "billingMode"),
    amount: str(formData, "amount"),
    effectiveFrom: str(formData, "effectiveFrom"),
    requestKey: str(formData, "requestKey"),
  });
  if (!parsed.success) return fromZodError(parsed.error);
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_student", {
    p_request_key: v.requestKey,
    p_name: v.name,
    p_grade: v.grade,
    p_subject: v.subject,
    p_address: v.address,
    p_guardian_name: v.guardianName,
    p_guardian_phone: v.guardianPhone,
    p_notes: v.notes,
    p_billing_mode: v.billingMode,
    p_amount: v.amount,
    p_effective_from: v.effectiveFrom,
  });
  if (error) return fromDbError(error);
  const studentId = (data as { studentId: string }).studentId;
  revalidatePath("/students");
  redirect(`/students/${studentId}?created=1`);
}

export async function updateStudent(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = studentFields
    .extend({ studentId: z.uuid(), version: z.coerce.number().int() })
    .safeParse({ ...readStudent(formData), studentId: str(formData, "studentId"), version: str(formData, "version") });
  if (!parsed.success) return fromZodError(parsed.error);
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_student", {
    p_student_id: v.studentId,
    p_expected_version: v.version,
    p_name: v.name,
    p_grade: v.grade,
    p_subject: v.subject,
    p_address: v.address,
    p_guardian_name: v.guardianName,
    p_guardian_phone: v.guardianPhone,
    p_notes: v.notes,
  });
  if (error) return fromDbError(error);
  revalidatePath("/students");
  redirect(`/students/${v.studentId}`);
}

export async function setStudentStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({ studentId: z.uuid(), version: z.coerce.number().int(), status: z.enum(["active", "archived"]) })
    .safeParse({ studentId: str(formData, "studentId"), version: str(formData, "version"), status: str(formData, "status") });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_student_status", {
    p_student_id: parsed.data.studentId,
    p_expected_version: parsed.data.version,
    p_status: parsed.data.status,
  });
  if (error) return fromDbError(error);
  revalidatePath("/", "layout");
  return {
    ok: true,
    data: null,
    message: parsed.data.status === "archived" ? "Murid diarsipkan. Jadwal mendatang dihapus." : "Murid aktif kembali.",
  };
}

export async function setBillingPlan(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = planFields.extend({ studentId: z.uuid() }).safeParse({
    studentId: str(formData, "studentId"),
    billingMode: str(formData, "billingMode"),
    amount: str(formData, "amount"),
    effectiveFrom: str(formData, "effectiveFrom"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_billing_plan", {
    p_student_id: parsed.data.studentId,
    p_mode: parsed.data.billingMode,
    p_amount: parsed.data.amount,
    p_effective_from: parsed.data.effectiveFrom,
  });
  if (error) return fromDbError(error);
  revalidatePath(`/students/${parsed.data.studentId}`);
  return { ok: true, data: null, message: "Tarif baru tersimpan. Tagihan yang sudah dibuat tidak berubah." };
}
