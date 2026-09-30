import { describe, expect, it } from "vitest";
import { currentPlan } from "./current-plan";

const plans = [
  { mode: "monthly" as const, amount: 400000, effective_from: "2026-01-01" },
  { mode: "per_session" as const, amount: 120000, effective_from: "2026-10-01" },
];

describe("currentPlan", () => {
  it("picks the plan in force on a day", () => {
    expect(currentPlan(plans, "2026-09-30")?.amount).toBe(400000);
    expect(currentPlan(plans, "2026-10-01")?.amount).toBe(120000);
  });

  it("falls back to the earliest future plan", () => {
    expect(currentPlan(plans, "2025-12-31")?.amount).toBe(400000);
    expect(currentPlan([], "2026-01-01")).toBeUndefined();
  });
});
