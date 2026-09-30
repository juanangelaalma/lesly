type Plan = { mode: "monthly" | "per_session"; amount: number; effective_from: string };

/** Plan in force on `day` (YYYY-MM-DD), or the earliest future plan when none has started yet. */
export function currentPlan<T extends Plan>(plans: T[], day: string): T | undefined {
  const sorted = [...plans].sort((a, b) => b.effective_from.localeCompare(a.effective_from));
  return sorted.find((p) => p.effective_from <= day) ?? sorted[sorted.length - 1];
}
