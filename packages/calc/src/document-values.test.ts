import { describe, expect, it } from "vitest";
import { parseDocumentAmount, parseDocumentDate, parseDocumentNumber } from "./document-values";
import { wholeMonthsBetween } from "./due-dates";

describe("parseDocumentAmount", () => {
  it.each([
    // US and UK style.
    ["1,676.90", undefined, 167690, null],
    ["USD 1,676.90", ".", 167690, "USD"],
    ["$1,284.00", undefined, 128400, null],
    ["US$ 98.00", undefined, 9800, "USD"],
    ["£12.5", undefined, 1250, "GBP"],
    ["0.00", undefined, 0, null],
    ["1234", undefined, 123400, null],
    // European style.
    ["1.234,56 €", ",", 123456, "EUR"],
    ["1.234,56 €", undefined, 123456, "EUR"],
    ["€ 1 234,56", undefined, 123456, "EUR"],
    ["1 234,56 EUR", undefined, 123456, "EUR"],
    ["12,34", undefined, 1234, null],
    ["12,3 EUR", undefined, 1230, "EUR"],
    ["1.234", ",", 123400, null],
    ["1.234.567,00 EUR", undefined, 123456700, "EUR"],
    ["1.234.567", undefined, 123456700, null],
    // Swiss style.
    ["CHF 1'234.50", undefined, 123450, "CHF"],
    // Credits.
    ["-45.00", undefined, -4500, null],
    ["(45.00)", undefined, -4500, null],
    ["-€45,00", undefined, -4500, "EUR"],
    ["€ -45,00", undefined, -4500, "EUR"],
  ] as const)("reads %j (decimals %j) as %i cents in %j", (text, decimalSeparator, cents, currency) => {
    expect(parseDocumentAmount(text, { decimalSeparator })).toMatchObject({ cents, currency });
  });

  it("notes a bare dollar sign without choosing a currency", () => {
    expect(parseDocumentAmount("$1,284.00")).toEqual({ cents: 128400, currency: null, dollarSign: true });
    expect(parseDocumentAmount("US$ 1.00").dollarSign).toBe(false);
  });

  it.each([
    ["1,234", undefined, "could be decimals or thousands"],
    ["1.234", undefined, "could be decimals or thousands"],
    ["1,234.56", ",", 'uses ","'],
    ["1.234,56", ".", 'uses "."'],
    ["12,34", ".", "groups of three"],
    ["1,234", ",", "more than 2 decimals"],
    ["1.234.567", ".", "more than once"],
    ["12.34", ",", "groups of three"],
    ["1,2,3", undefined, "groups of three"],
    ["1.2,3,4", undefined, "misplaced"],
    ["12 34", undefined, "spaces"],
    ["", undefined, "unexpected"],
    ["abc", undefined, "unexpected"],
    ["1e3", undefined, "unexpected"],
    ["12.", undefined, "nothing after"],
    ["USD 12 EUR", undefined, "Two currencies"],
    ["12 € USD", undefined, "Two currencies"],
  ] as const)("refuses %j (decimals %j)", (text, decimalSeparator, why) => {
    expect(() => parseDocumentAmount(text, { decimalSeparator })).toThrow(why);
  });
});

describe("parseDocumentNumber", () => {
  it.each([
    ["1,412", ".", 1412],
    ["1.412", ",", 1412],
    ["1,412 h", ".", 1412],
    ["1512 hours", undefined, 1512],
    ["1.412,5", undefined, 1412.5],
    ["250", undefined, 250],
  ] as const)("reads %j as %d", (text, decimalSeparator, value) => {
    expect(parseDocumentNumber(text, { decimalSeparator })).toBe(value);
  });

  it("refuses an ambiguous or over-precise reading", () => {
    expect(() => parseDocumentNumber("1,412")).toThrow("could be decimals or thousands");
    expect(() => parseDocumentNumber("1412.25")).toThrow("more than 1 decimals");
  });
});

describe("parseDocumentDate", () => {
  it.each([
    ["2026-10-02", undefined, "2026-10-02"],
    ["2026/10/2", undefined, "2026-10-02"],
    ["02.10.2026", "DMY", "2026-10-02"],
    ["10/02/2026", "MDY", "2026-10-02"],
    ["13.10.2026", undefined, "2026-10-13"],
    ["10/13/2026", undefined, "2026-10-13"],
    ["05/05/2026", undefined, "2026-05-05"],
    ["2 Oct 2026", undefined, "2026-10-02"],
    ["2nd October 2026", undefined, "2026-10-02"],
    ["October 2, 2026", undefined, "2026-10-02"],
    ["Oct. 2 2026", undefined, "2026-10-02"],
    ["1er octobre 2026", undefined, "2026-10-01"],
    ["3 septembre 2026", undefined, "2026-09-03"],
    ["2. Oktober 2026", undefined, "2026-10-02"],
    ["15 März 2027", undefined, "2027-03-15"],
    ["2 de octubre de 2026", undefined, "2026-10-02"],
    ["30 aout 2026", undefined, "2026-08-30"],
    ["29 Feb 2028", undefined, "2028-02-29"],
  ] as const)("reads %j (order %j) as %s", (text, order, iso) => {
    expect(parseDocumentDate(text, { order })).toBe(iso);
  });

  it.each([
    ["02.10.2026", undefined, "either way round"],
    ["02.10.26", "DMY", "two-digit year"],
    ["31.02.2026", "DMY", "Not a date"],
    ["29 Feb 2027", undefined, "Not a date"],
    ["2026-13-01", undefined, "Not a date"],
    ["02.10.2026", "YMD", "year first"],
    ["2 Jui 2026", undefined, "unrecognised"],
    ["next Tuesday", undefined, "unrecognised"],
    ["2 Oct", undefined, "unrecognised"],
    ["", undefined, "unrecognised"],
  ] as const)("refuses %j (order %j)", (text, order, why) => {
    expect(() => parseDocumentDate(text, { order })).toThrow(why);
  });
});

describe("wholeMonthsBetween", () => {
  it.each([
    ["2026-10-02", "2027-10-02", 12],
    ["2026-10-02", "2026-11-02", 1],
    ["2026-01-31", "2026-02-28", 1],
    ["2026-10-02", "2028-10-02", 24],
  ])("from %s to %s is %i months", (from, to, months) => {
    expect(wholeMonthsBetween(from, to)).toBe(months);
  });

  it.each([
    ["2026-10-02", "2027-10-01"],
    ["2026-10-02", "2026-10-02"],
    ["2026-10-02", "2025-10-02"],
  ])("from %s to %s is not a whole number of months", (from, to) => {
    expect(wholeMonthsBetween(from, to)).toBeNull();
  });
});
