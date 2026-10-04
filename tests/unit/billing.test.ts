import { describe, expect, it } from "vitest";

import { getInvoiceStatusLabel, summarizeInvoice } from "@/lib/billing";

describe("invoice totals and status", () => {
  it("derives partial payment and overdue status without storing a balance", () => {
    const result = summarizeInvoice(
      [{ amount_rupiah: 400000, state: "active" }],
      [{ amount_rupiah: 150000, state: "posted" }],
      "2026-10-05",
      "2026-10-07",
    );

    expect(result).toEqual({
      status: "partial",
      isOverdue: true,
      total: 400000,
      paid: 150000,
      remaining: 250000,
    });
    expect(getInvoiceStatusLabel(result.status, result.isOverdue)).toBe(
      "Terlambat",
    );
  });

  it("ignores void charges and cancelled payment records", () => {
    const result = summarizeInvoice(
      [
        { amount_rupiah: 50000, state: "active" },
        { amount_rupiah: 50000, state: "void" },
      ],
      [
        { amount_rupiah: 20000, state: "posted" },
        { amount_rupiah: 30000, state: "void" },
      ],
      "2026-10-05",
      "2026-10-03",
    );

    expect(result.status).toBe("partial");
    expect(result.remaining).toBe(30000);
    expect(result.isOverdue).toBe(false);
  });

  it("reports zero-charge periods and rejects inconsistent overpayment", () => {
    const empty = summarizeInvoice([], [], "2026-10-05", "2026-10-06");

    expect(empty.status).toBe("no_charge");
    expect(empty.isOverdue).toBe(false);
    expect(() =>
      summarizeInvoice(
        [{ amount_rupiah: 10, state: "active" }],
        [{ amount_rupiah: 11, state: "posted" }],
        "2026-10-05",
        "2026-10-06",
      ),
    ).toThrow("Pembayaran tercatat melebihi total tagihan.");
  });
});
