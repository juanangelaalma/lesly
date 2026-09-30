import type { ZodError } from "zod";
import type { ActionErrorCode, ActionResult } from "./action-result";

const CODES: ActionErrorCode[] = [
  "VALIDATION",
  "UNAUTHENTICATED",
  "NOT_FOUND",
  "CONFLICT",
  "PAYMENT_EXCEEDS_BALANCE",
  "SCHEDULE_OVERLAP",
];

/** Maps a database error raised as "CODE: message" into an ActionResult failure. */
export function fromDbError(error: { message: string; code?: string } | null): ActionResult<never> {
  const message = error?.message ?? "";
  const match = /^([A-Z_]+): ([\s\S]+)$/.exec(message);
  if (match && CODES.includes(match[1] as ActionErrorCode)) {
    return { ok: false, code: match[1] as ActionErrorCode, message: match[2] };
  }
  if (error?.code === "42501" || /JWT|not authenticated/i.test(message)) {
    return { ok: false, code: "UNAUTHENTICATED", message: "Silakan masuk kembali." };
  }
  console.error("Unexpected database error", error);
  return { ok: false, code: "INTERNAL", message: "Terjadi kesalahan. Coba lagi sebentar lagi." };
}

export function fromZodError(error: ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { ok: false, code: "VALIDATION", message: "Periksa kembali isian yang ditandai.", fieldErrors };
}
