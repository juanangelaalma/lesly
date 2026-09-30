import { describe, expect, it } from "vitest";
import { toCsv } from "../csv";

describe("csv", () => {
  it("quotes separators and neutralizes formulas", () => {
    expect(toCsv(["a", "b"], [["x,y", "=SUM(A1)"], [null, 5]])).toBe('a,b\r\n"x,y",\'=SUM(A1)\r\n,5');
  });
});
