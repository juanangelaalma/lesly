export type ActionErrorCode =
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYMENT_EXCEEDS_BALANCE"
  | "SCHEDULE_OVERLAP"
  | "INTERNAL";

export type ActionResult<T = null> =
  | { ok: true; data: T; message?: string }
  | { ok: false; code: ActionErrorCode; message: string; fieldErrors?: Record<string, string[]> };

export type FormState<T = null> = ActionResult<T> | { ok: null };

export const idle: FormState<never> = { ok: null };
