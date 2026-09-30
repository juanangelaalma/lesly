/** Reads a FormData entry as a trimmed string ("" when absent or a file). */
export function str(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}
