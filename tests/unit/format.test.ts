import { describe, expect, it } from "vitest";

import {
  formatRupiah,
  getCurrentBillingPlan,
  jakartaDateInputValue,
} from "../../src/lib/format";

describe("teacher-local date and billing helpers", () => {
  it("uses the Jakarta calendar date across the UTC day boundary", () => {
    expect(jakartaDateInputValue(new Date("2026-10-04T17:30:00.000Z"))).toBe(
      "2026-10-05",
    );
  });

  it("selects the latest plan effective in the current local month", () => {
    const plans = [
      { id: "future", effective_month: "2026-11-01" },
      { id: "current", effective_month: "2026-10-01" },
      { id: "old", effective_month: "2026-08-01" },
    ];

    expect(
      getCurrentBillingPlan(plans, new Date("2026-10-04T17:30:00.000Z"))?.id,
    ).toBe("current");
  });

  it("formats Rupiah without fractional sen", () => {
    expect(formatRupiah(400000).replace(/\u00a0/g, " ")).toContain(
      "Rp 400.000",
    );
  });
});
