import { describe, expect, it } from "vitest";
import { formatCents, toCents } from "./money";

describe("toCents", () => {
  it.each([
    ["0", 0],
    ["12", 1200],
    ["12.3", 1230],
    ["12.34", 1234],
    ["-12.30", -1230],
    ["1,234.56", 123456],
    [" 7.05 ", 705],
    ["-0.00", 0],
  ])("parses %j as %i cents", (input, expected) => {
    expect(toCents(input)).toBe(expected);
  });

  it.each(["", "abc", "12.345", "1.2.3", "12,34", "€12", "1e3"])("rejects %j", (input) => {
    expect(() => toCents(input)).toThrow();
  });
});

describe("formatCents", () => {
  it.each([
    [0, "0.00"],
    [5, "0.05"],
    [123456, "1234.56"],
    [-1230, "-12.30"],
  ])("formats %i as %j", (input, expected) => {
    expect(formatCents(input)).toBe(expected);
  });

  it("round-trips with toCents", () => {
    for (const cents of [0, 1, 99, 100, 101, -250, 987654321]) {
      expect(toCents(formatCents(cents))).toBe(cents);
    }
  });

  it("rejects fractional cents", () => {
    expect(() => formatCents(1.5)).toThrow();
  });
});
