"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/action-state";
import {
  completeSessionSchema,
  reopenSessionSchema,
  updateSessionNoteSchema,
} from "@/features/sessions/schemas";

function value(formData: FormData, name: string) {
  return formData.get(name)?.toString() ?? "";
}

function sessionError(code?: string) {
  if (code === "23P01") {
    return "Waktu sesi bertabrakan dengan jadwal lain.";
  }

  if (code === "40001") {
    return "Sesi berubah. Muat ulang halaman sebelum mencoba lagi.";
  }

  if (code === "23514") {
    return "Perubahan akan membuat jumlah tagihan tidak sesuai dengan pembayaran.";
  }

  return "Catatan belum tersimpan. Periksa isian lalu coba lagi.";
}

export async function completeSessionAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = completeSessionSchema.safeParse({
    sessionId: value(formData, "sessionId"),
    expectedVersion: value(formData, "expectedVersion"),
    requestKey: value(formData, "requestKey"),
    topicName: value(formData, "topicName"),
    understanding: value(formData, "understanding"),
    note: value(formData, "note"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Isi materi dan pilih pemahaman sesi." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("complete_session", {
    p_session_id: parsed.data.sessionId,
    p_expected_version: parsed.data.expectedVersion,
    p_request_key: parsed.data.requestKey,
    p_topic_name: parsed.data.topicName,
    p_understanding: parsed.data.understanding,
    p_note: parsed.data.note || null,
  });

  if (error || !data) {
    return { status: "error", message: sessionError(error?.code) };
  }

  revalidatePath("/today");
  revalidatePath("/students");
  revalidatePath("/sessions/" + data);
  revalidatePath("/sessions/" + data + "/report");
  revalidatePath("/invoices");

  return {
    status: "success",
    message: "Catatan sesi tersimpan.",
    redirectTo: "/sessions/" + data + "/report",
  };
}

export async function updateSessionNoteAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = updateSessionNoteSchema.safeParse({
    noteId: value(formData, "noteId"),
    sessionId: value(formData, "sessionId"),
    expectedVersion: value(formData, "expectedVersion"),
    topicName: value(formData, "topicName"),
    understanding: value(formData, "understanding"),
    note: value(formData, "note"),
    reason: value(formData, "reason"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Periksa materi, pemahaman, dan alasan.",
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("update_session_note", {
    p_note_id: parsed.data.noteId,
    p_expected_version: parsed.data.expectedVersion,
    p_topic_name: parsed.data.topicName,
    p_understanding: parsed.data.understanding,
    p_note: parsed.data.note || null,
    p_reason: parsed.data.reason,
  });

  if (error) {
    return { status: "error", message: sessionError(error.code) };
  }

  revalidatePath("/students");
  revalidatePath("/sessions/" + parsed.data.sessionId);
  revalidatePath("/sessions/" + parsed.data.sessionId + "/report");

  return {
    status: "success",
    message: "Koreksi catatan tersimpan. Tagihan tidak berubah.",
    redirectTo: "/sessions/" + parsed.data.sessionId,
  };
}

export async function reopenSessionAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = reopenSessionSchema.safeParse({
    sessionId: value(formData, "sessionId"),
    expectedVersion: value(formData, "expectedVersion"),
    reason: value(formData, "reason"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Isi alasan untuk membuka kembali sesi.",
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("reopen_session", {
    p_session_id: parsed.data.sessionId,
    p_expected_version: parsed.data.expectedVersion,
    p_reason: parsed.data.reason,
  });

  if (error) {
    return { status: "error", message: sessionError(error.code) };
  }

  revalidatePath("/today");
  revalidatePath("/students");
  revalidatePath("/sessions/" + parsed.data.sessionId);
  revalidatePath("/invoices");
  redirect("/sessions/" + parsed.data.sessionId);
}
