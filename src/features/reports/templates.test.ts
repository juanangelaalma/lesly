import { describe, expect, it } from "vitest";
import { invoiceReminderText, sessionReportText } from "./templates";

describe("report templates", () => {
  it("builds a session report without claiming delivery", () => {
    const text = sessionReportText({
      guardianName: "Ibu Sari",
      studentName: "Budi",
      date: "2026-09-30",
      topic: "Pecahan",
      understanding: "assisted",
      note: "Latihan soal cerita.",
      signature: "Kak Dinda",
    });
    expect(text).toContain("Halo Ibu Sari,");
    expect(text).toContain("Rabu, 30 September 2026");
    expect(text).toContain("Pemahaman: Masih perlu dibantu");
    expect(text).toContain("Catatan: Latihan soal cerita.");
    expect(text.endsWith("Kak Dinda")).toBe(true);
  });

  it("omits the note line when empty and uses a generic greeting", () => {
    const text = sessionReportText({
      guardianName: null,
      studentName: "Budi",
      date: "2026-09-30",
      topic: "Pecahan",
      understanding: "independent",
      note: null,
      signature: "Kak Dinda",
    });
    expect(text.startsWith("Halo Ayah/Bunda,")).toBe(true);
    expect(text).not.toContain("Catatan:");
  });

  it("shows partial payment balance in reminders", () => {
    const text = invoiceReminderText({
      guardianName: null,
      studentName: "Budi",
      period: "2026-09-01",
      items: [{ description: "Biaya bulanan", amount: 400000 }],
      total: 400000,
      paid: 150000,
      signature: "Kak Dinda",
    });
    expect(text).toContain("September 2026");
    expect(text).toContain("Sudah dibayar: Rp 150.000");
    expect(text).toContain("Sisa tagihan: Rp 250.000");
  });
});
