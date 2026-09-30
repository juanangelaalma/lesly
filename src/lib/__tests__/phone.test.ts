import { describe, expect, it } from "vitest";
import { formatPhone, normalizePhone, whatsappUrl } from "../phone";

describe("phone", () => {
  it("normalizes Indonesian numbers to E.164", () => {
    expect(normalizePhone("0812-3456-7890")).toBe("+6281234567890");
    expect(normalizePhone("+62 812 3456 7890")).toBe("+6281234567890");
    expect(normalizePhone("81234567890")).toBe("+6281234567890");
    expect(normalizePhone("006281234567890")).toBe("+6281234567890");
  });

  it("rejects invalid numbers", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("12")).toBeNull();
    expect(normalizePhone("08abc")).toBeNull();
  });

  it("formats E.164 back to local style", () => {
    expect(formatPhone("+6281234567890")).toBe("0812-3456-7890");
  });

  it("builds an encoded wa.me URL", () => {
    expect(whatsappUrl("Halo Bu & Pak\nMateri: 1+1", "+6281234567890")).toBe(
      "https://wa.me/6281234567890?text=Halo%20Bu%20%26%20Pak%0AMateri%3A%201%2B1",
    );
    expect(whatsappUrl("Hi", null)).toBe("https://wa.me/?text=Hi");
  });
});
