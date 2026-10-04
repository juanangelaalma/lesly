import { describe, expect, it } from "vitest";

import { createSessionReport } from "@/features/reports/template";

describe("session report text", () => {
  it("omits an empty optional note and uses the saved observation", () => {
    const text = createSessionReport({
      studentName: "Alya",
      guardianName: "Ibu Rina",
      tutorName: "Bu Sari",
      startsAt: "2026-09-30T08:00:00.000Z",
      timezone: "Asia/Jakarta",
      topicName: "Perkalian dua angka",
      understanding: "assisted",
      note: "   ",
    });

    expect(text).toContain("Materi: Perkalian dua angka.");
    expect(text).toContain("Pemahaman: masih perlu bantuan.");
    expect(text).not.toContain("Catatan:");
    expect(text).toContain("— Bu Sari");
  });
});
