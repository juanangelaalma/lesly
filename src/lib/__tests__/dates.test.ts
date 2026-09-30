import { describe, expect, it } from "vitest";
import { addDays, addMonths, formatDateLong, isoWeekday, localDate, localTime, monthStart, toInstant } from "../dates";

describe("dates", () => {
  it("converts local wall time to an instant per zone", () => {
    expect(toInstant("2026-09-30", "16:00", "Asia/Jakarta")).toBe("2026-09-30T09:00:00.000Z");
    expect(toInstant("2026-09-30", "16:00", "Asia/Jayapura")).toBe("2026-09-30T07:00:00.000Z");
    expect(toInstant("bad", "16:00", "Asia/Jakarta")).toBeNull();
  });

  it("reads local date and time across midnight", () => {
    const instant = "2026-09-30T18:30:00.000Z";
    expect(localDate(instant, "Asia/Jakarta")).toBe("2026-10-01");
    expect(localTime(instant, "Asia/Jakarta")).toBe("01:30");
    expect(localDate(instant, "Asia/Jakarta")).not.toBe(localDate(instant.replace("18:30", "10:00"), "Asia/Jakarta"));
  });

  it("does calendar arithmetic", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addMonths("2026-12-01", 1)).toBe("2027-01-01");
    expect(addMonths("2026-01-01", -1)).toBe("2025-12-01");
    expect(monthStart("2026-09-30")).toBe("2026-09-01");
    expect(isoWeekday("2026-10-04")).toBe(7);
    expect(formatDateLong("2026-09-30")).toBe("Rabu, 30 September 2026");
  });
});
