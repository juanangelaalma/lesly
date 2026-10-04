import { describe, expect, it } from "vitest";

import { normalizeIndonesianPhone } from "../../src/lib/phone";

describe("normalizeIndonesianPhone", () => {
  it("converts a local Indonesian mobile number to E.164", () => {
    expect(normalizeIndonesianPhone("0812 3456 7890")).toEqual({
      valid: true,
      value: "+6281234567890",
    });
  });

  it("keeps an existing country code and treats an empty value as optional", () => {
    expect(normalizeIndonesianPhone("+62 812-3456-7890")).toEqual({
      valid: true,
      value: "+6281234567890",
    });
    expect(normalizeIndonesianPhone(" ")).toEqual({
      valid: true,
      value: null,
    });
  });

  it("rejects numbers outside the supported E.164 range", () => {
    expect(normalizeIndonesianPhone("0812")).toEqual({
      valid: false,
      value: null,
    });
  });
});
