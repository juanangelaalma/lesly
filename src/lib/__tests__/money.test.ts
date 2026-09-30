import { describe, expect, it } from "vitest";
import { formatRupiah, parseRupiah } from "../money";

describe("money", () => {
  it("formats integer Rupiah without decimals", () => {
    expect(formatRupiah(400000)).toBe("Rp 400.000");
    expect(formatRupiah(0)).toBe("Rp 0");
  });

  it("parses user-typed amounts", () => {
    expect(parseRupiah("Rp 150.000")).toBe(150000);
    expect(parseRupiah("150000")).toBe(150000);
    expect(parseRupiah("")).toBeNull();
    expect(parseRupiah("abc")).toBeNull();
  });
});
