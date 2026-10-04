import { describe, expect, it } from "vitest";

import {
  indonesiaDayUtcBounds,
  isoToLocalDateTime,
  localDateTimeToIso,
} from "@/lib/dates";

describe("Indonesian local date conversion", () => {
  it("converts a Jakarta form time to the matching UTC instant", () => {
    expect(localDateTimeToIso("2026-10-04T15:00", "Asia/Jakarta")).toBe(
      "2026-10-04T08:00:00.000Z",
    );
  });

  it("uses the selected Indonesia timezone for display and conversion", () => {
    const instant = localDateTimeToIso("2026-10-04T15:30", "Asia/Jayapura");

    expect(instant).toBe("2026-10-04T06:30:00.000Z");
    expect(isoToLocalDateTime(instant, "Asia/Jayapura")).toBe(
      "2026-10-04T15:30",
    );
  });

  it("keeps early local times on the selected calendar day", () => {
    const instant = localDateTimeToIso("2026-10-04T00:15", "Asia/Jayapura");

    expect(instant).toBe("2026-10-03T15:15:00.000Z");
    expect(isoToLocalDateTime(instant, "Asia/Jayapura")).toBe(
      "2026-10-04T00:15",
    );
  });

  it("returns the correct UTC interval for a local agenda day", () => {
    expect(indonesiaDayUtcBounds("2026-10-04", "Asia/Jayapura")).toEqual({
      start: "2026-10-03T15:00:00.000Z",
      end: "2026-10-04T15:00:00.000Z",
    });
  });

  it("rejects invalid dates and unsupported timezones", () => {
    expect(() =>
      localDateTimeToIso("2026-02-30T15:00", "Asia/Jakarta"),
    ).toThrow();
    expect(() => indonesiaDayUtcBounds("2026-02-31", "Asia/Jakarta")).toThrow();
    expect(() => localDateTimeToIso("2026-10-04T15:00", "UTC")).toThrow();
  });
});
