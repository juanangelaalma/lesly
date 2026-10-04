import type { FormState } from "@/lib/action-state";

export function FormFeedback({ state }: { state: FormState }) {
  if (state.status === "idle") {
    return null;
  }

  return (
    <p
      className="form-feedback"
      data-status={state.status}
      role={state.status === "error" ? "alert" : "status"}
    >
      {state.message}
    </p>
  );
}
