import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

const control =
  "w-full rounded-[var(--radius-control)] border-2 border-line-control bg-surface px-4 py-3 text-base text-ink placeholder:text-ink-faint transition-[border-color,box-shadow] duration-150 focus:border-teal-deep focus:shadow-clay focus:outline-none aria-[invalid=true]:border-danger disabled:bg-surface-alt";

type FieldProps = {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  errors?: string[];
  optional?: boolean;
  children: ReactNode;
  className?: string;
};

export function Field({ label, htmlFor, hint, errors, optional, children, className }: FieldProps) {
  const describedBy = errors?.length ? `${htmlFor}-error` : hint ? `${htmlFor}-hint` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)} data-described-by={describedBy}>
      <label htmlFor={htmlFor} className="font-label text-sm font-bold text-ink">
        {label}
        {optional ? <span className="ml-1 font-semibold text-ink-muted">(opsional)</span> : null}
      </label>
      {children}
      {errors?.length ? (
        <p id={`${htmlFor}-error`} className="text-sm text-danger">
          {errors[0]}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, invalid, ...props }: ComponentProps<"input"> & { invalid?: boolean }) {
  return <input aria-invalid={invalid || undefined} className={cn(control, "min-h-12", className)} {...props} />;
}

export function Textarea({ className, invalid, ...props }: ComponentProps<"textarea"> & { invalid?: boolean }) {
  return <textarea aria-invalid={invalid || undefined} className={cn(control, "min-h-24 resize-y", className)} {...props} />;
}

export function Select({ className, invalid, ...props }: ComponentProps<"select"> & { invalid?: boolean }) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn(control, "min-h-12 appearance-none bg-[length:16px] bg-[right_1rem_center] bg-no-repeat pr-10", className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'%3E%3Cpath fill='none' stroke='%232d3047' stroke-linecap='round' stroke-linejoin='round' stroke-width='24' d='m208 96-80 80-80-80'/%3E%3C/svg%3E\")",
      }}
      {...props}
    />
  );
}

type ChoiceOption = { value: string; label: string; description?: string };

/** Radio group rendered as pressable clay chips. */
export function ChoiceGroup({
  name,
  legend,
  options,
  defaultValue,
  errors,
  columns = 3,
}: {
  name: string;
  legend: string;
  options: ChoiceOption[];
  defaultValue?: string;
  errors?: string[];
  columns?: 2 | 3;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 font-label text-sm font-bold text-ink">{legend}</legend>
      <div className={cn("grid gap-2", columns === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2")}>
        {options.map((option) => (
          <label key={option.value} className="relative block cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={defaultValue === option.value}
              className="peer sr-only"
              required
            />
            <span className="pressable flex min-h-12 flex-col justify-center rounded-[var(--radius-control)] border-2 border-line-control bg-surface px-4 py-2.5 peer-checked:border-ink peer-checked:bg-teal-soft peer-checked:shadow-clay-bold peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal-deep">
              <span className="font-label text-[15px] font-bold">{option.label}</span>
              {option.description ? <span className="text-sm text-ink-muted">{option.description}</span> : null}
            </span>
          </label>
        ))}
      </div>
      {errors?.length ? <p className="text-sm text-danger">{errors[0]}</p> : null}
    </fieldset>
  );
}
