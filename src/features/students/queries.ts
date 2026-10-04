import { createClient } from "@/lib/supabase/server";

export async function getStudents() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("students")
    .select("id, name, grade, guardian_name, starts_on, version, archived_at")
    .is("archived_at", null)
    .order("name");

  if (error) {
    throw new Error("Daftar murid tidak dapat dimuat.");
  }

  return data;
}

export async function getStudent(studentId: string) {
  const supabase = await createClient();

  const { data: student, error } = await supabase
    .from("students")
    .select(
      "id, name, grade, guardian_name, guardian_phone_e164, address_hint, starts_on, ends_on, archived_at, version",
    )
    .eq("id", studentId)
    .maybeSingle();

  if (error) {
    throw new Error("Informasi murid tidak dapat dimuat.");
  }

  if (!student) {
    return null;
  }

  const { data: plans, error: plansError } = await supabase
    .from("billing_plans")
    .select("id, effective_month, mode, rate_rupiah, due_day")
    .eq("student_id", studentId)
    .order("effective_month", { ascending: false });

  if (plansError) {
    throw new Error("Informasi tarif tidak dapat dimuat.");
  }

  return { student, plans };
}

export async function getStudentCount() {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null);

  if (error) {
    throw new Error("Ringkasan murid tidak dapat dimuat.");
  }

  return count ?? 0;
}
