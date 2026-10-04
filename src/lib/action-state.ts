export type StudentField =
  | "name"
  | "grade"
  | "guardianName"
  | "guardianPhone"
  | "addressHint"
  | "startsOn"
  | "billingMode"
  | "rateRupiah"
  | "dueDay"
  | "effectiveMonth";

export type FormState =
  | { status: "idle" }
  | { status: "success"; message: string; redirectTo?: string }
  | {
      status: "error";
      message: string;
      fieldErrors?: Partial<Record<StudentField, string>>;
    };

export const initialFormState: FormState = { status: "idle" };
