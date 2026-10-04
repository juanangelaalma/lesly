"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormState } from "@/lib/action-state";
import { jakartaDateInputValue } from "@/lib/format";
import { normalizeIndonesianPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import { studentFormSchema } from "@/features/students/schemas";

export async function saveStudentAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = studentFormSchema.safeParse({
    studentId: formData.get("studentId") || null,
    expectedVersion: formData.get("expectedVersion")?.toString() || null,
    requestKey: formData.get("requestKey"),
    name: formData.get("name"),
    grade: formData.get("grade") ?? "",
    guardianName: formData.get("guardianName") ?? "",
    guardianPhone: formData.get("guardianPhone") ?? "",
    addressHint: formData.get("addressHint") ?? "",
    startsOn: formData.get("startsOn"),
    billingMode: formData.get("billingMode"),
    rateRupiah: formData.get("rateRupiah"),
    dueDay: formData.get("dueDay"),
    effectiveMonth: formData.get("effectiveMonth") ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Periksa kembali data murid.",
    };
  }

  const phone = normalizeIndonesianPhone(parsed.data.guardianPhone);

  if (!phone.valid) {
    return {
      status: "error",
      message:
        "Nomor WhatsApp belum valid. Gunakan nomor Indonesia, misalnya 0812…",
    };
  }

  const isNew = parsed.data.studentId === null;
  const monthNow = jakartaDateInputValue().slice(0, 7);

  if (
    !isNew &&
    parsed.data.effectiveMonth &&
    parsed.data.effectiveMonth <= monthNow
  ) {
    return {
      status: "error",
      message:
        "Tarif baru berlaku mulai bulan berikutnya. Pilih bulan setelah bulan ini.",
    };
  }

  const effectiveMonth = isNew
    ? `${parsed.data.startsOn.slice(0, 7)}-01`
    : parsed.data.effectiveMonth
      ? `${parsed.data.effectiveMonth}-01`
      : null;

  const supabase = await createClient();

  const { data: studentId, error } = await supabase.rpc("save_student", {
    p_student_id: parsed.data.studentId,
    p_expected_version: parsed.data.expectedVersion,
    p_request_key: parsed.data.requestKey,
    p_name: parsed.data.name,
    p_grade: parsed.data.grade || null,
    p_guardian_name: parsed.data.guardianName || null,
    p_guardian_phone_e164: phone.value,
    p_address_hint: parsed.data.addressHint || null,
    p_starts_on: parsed.data.startsOn,
    p_effective_month: effectiveMonth,
    p_billing_mode: isNew || effectiveMonth ? parsed.data.billingMode : null,
    p_rate_rupiah: isNew || effectiveMonth ? parsed.data.rateRupiah : null,
    p_due_day: isNew || effectiveMonth ? parsed.data.dueDay : null,
  });

  if (error || !studentId) {
    if (error?.code === "40001") {
      return {
        status: "error",
        message:
          "Data murid berubah. Muat ulang halaman, lalu coba simpan lagi.",
      };
    }

    if (error?.code === "23505") {
      return {
        status: "error",
        message:
          "Sudah ada tarif efektif untuk bulan tersebut. Pilih bulan lain.",
      };
    }

    return {
      status: "error",
      message: "Data belum tersimpan. Periksa isian lalu coba lagi.",
    };
  }

  revalidatePath("/today");
  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);

  return {
    status: "success",
    message: "Data murid tersimpan.",
    redirectTo: `/students/${studentId}`,
  };
}

export async function archiveStudentAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const studentId = formData.get("studentId")?.toString() ?? "";
  const confirmation = formData.get("confirmation");

  if (!studentId) {
    return { status: "error", message: "Murid tidak ditemukan." };
  }

  if (confirmation !== "on") {
    return {
      status: "error",
      message: "Konfirmasi dulu sebelum mengarsipkan murid.",
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("archive_student", {
    p_student_id: studentId,
    p_reason: "Diarsipkan oleh guru.",
  });

  if (error || !data) {
    return {
      status: "error",
      message: "Murid belum dapat diarsipkan. Muat ulang lalu coba lagi.",
    };
  }

  revalidatePath("/students");
  revalidatePath("/today");
  redirect("/students");
}
