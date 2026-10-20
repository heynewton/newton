/**
 * Reading amounts, numbers and dates as a document prints them (#11).
 *
 * Extraction asks Claude to copy values exactly as written ("1.234,56 €", "02.10.2026") and to say
 * how the document writes numbers and dates. These functions turn the printed text into cents,
 * numbers and YYYY-MM-DD, and throw on anything they can't read without guessing, so a value is
 * flagged for review instead of saved wrong (principle 2).
 */

import { toCents } from "./money";

/** The character a document uses between whole units and decimals. */
export type DecimalSeparator = "." | ",";

/** The order a document writes all-number dates in. */
export type DateOrder = "DMY" | "MDY" | "YMD";

export interface ParsedAmount {
  /** Integer cents; a credit or refund is negative. */
  cents: number;
  /** The ISO 4217 code the text names, by code or by a symbol only one currency uses. */
  currency: string | null;
  /** True when the text has a bare "$", which many currencies use. */
  dollarSign: boolean;
}

// Symbols that name exactly one currency. "$" is handled separately; "¥" and "kr" are left out
// because they name several currencies, and yen has no cents anyway.
const CURRENCY_SYMBOLS: Record<string, string> = { "€": "EUR", "£": "GBP" };

// Spaces documents put between groups of thousands: plain, no-break, narrow no-break, thin.
const GROUP_SPACES = /[ \u00a0\u202f\u2009]/g;
// Apostrophes used for thousands in Switzerland (1'234.50).
const GROUP_APOSTROPHES = /['’]/g;

/**
 * Reads a printed number with the given (or detected) decimal separator. Returns the digits
 * before and after the decimal separator, or throws when the text is not a number written one
 * clear way: groups of thousands must have three digits, and a lone "1,234" or "1.234" needs
 * the separator to be known.
 */
function readDecimal(
  digits: string,
  original: string,
  separator: DecimalSeparator | undefined,
  maxDecimals: number,
): { whole: string; fraction: string } {
  const fail = (why: string): never => {
    throw new Error(`Not a number (${why}): "${original}"`);
  };
  if (!/^[\d.,]+$/.test(digits) || !/\d/.test(digits)) fail("unexpected characters");

  const dots = digits.split(".").length - 1;
  const commas = digits.split(",").length - 1;
  let decimal: DecimalSeparator | null = null;

  if (dots > 0 && commas > 0) {
    // Both present: the last one is the decimal separator.
    decimal = digits.lastIndexOf(".") > digits.lastIndexOf(",") ? "." : ",";
    if (separator && separator !== decimal) fail(`the document uses "${separator}" for decimals`);
  } else if (dots + commas === 1) {
    const mark: DecimalSeparator = dots ? "." : ",";
    const after = digits.length - digits.indexOf(mark) - 1;
    if (separator) {
      decimal = separator === mark ? mark : null;
    } else if (after === 3) {
      fail(`"${mark}" could be decimals or thousands`);
    } else {
      decimal = mark;
    }
  } else if (dots + commas > 1) {
    // One kind, several times: thousands only.
    const mark: DecimalSeparator = dots ? "." : ",";
    if (separator === mark) fail(`"${mark}" appears more than once`);
  }

  const at = decimal ? digits.lastIndexOf(decimal) : digits.length;
  const wholePart = digits.slice(0, at);
  const fraction = decimal ? digits.slice(at + 1) : "";
  if (decimal && wholePart.includes(decimal)) fail("misplaced separator");
  const groups = wholePart.split(/[.,]/);
  if (groups.some((g) => g === "")) fail("misplaced separator");
  if (groups.length > 1 && (groups[0]!.length > 3 || groups.slice(1).some((g) => g.length !== 3))) {
    fail("thousands must come in groups of three");
  }
  if (fraction.length === 0 && decimal) fail("nothing after the decimal separator");
  if (fraction.length > maxDecimals) fail(`more than ${maxDecimals} decimals`);
  return { whole: groups.join(""), fraction };
}

/**
 * Parses an amount as printed, such as "1.234,56 €", "USD 1,676.90", "$1,284.00", "€ 1 234,56",
 * "CHF 1'234.50" or "(45.00)" for a credit. `decimalSeparator` is how the document writes
 * decimals; without it, "1,234" and "1.234" are refused as ambiguous.
 */
export function parseDocumentAmount(text: string, options: { decimalSeparator?: DecimalSeparator } = {}): ParsedAmount {
  let rest = text.trim();
  let negative = false;
  if (rest.startsWith("(") && rest.endsWith(")")) {
    negative = true;
    rest = rest.slice(1, -1).trim();
  }

  let currency: string | null = null;
  let dollarSign = false;
  const named = (code: string) => {
    if (currency && currency !== code) throw new Error(`Two currencies in one amount: "${text}"`);
    currency = code;
  };

  // A three-letter code before or after the number (USD 12.00, 12,00 EUR).
  const code = /^([A-Z]{3})\s*|\s*([A-Z]{3})$/;
  for (let match = code.exec(rest); match; match = code.exec(rest)) {
    named((match[1] ?? match[2])!);
    rest = rest.slice(0, match.index) + rest.slice(match.index + match[0].length);
  }
  rest = rest.trim();
  if (rest.startsWith("-")) {
    negative = !negative;
    rest = rest.slice(1).trim();
  }
  // A symbol before or after the number, possibly with a sign between (−$5, US$5, 5 €).
  const symbol = /^(US\$|\$|€|£)\s*|\s*(US\$|\$|€|£)$/;
  for (let match = symbol.exec(rest); match; match = symbol.exec(rest)) {
    const s = (match[1] ?? match[2])!;
    if (s === "US$") named("USD");
    else if (s === "$") dollarSign = true;
    else named(CURRENCY_SYMBOLS[s]!);
    rest = rest.slice(0, match.index) + rest.slice(match.index + match[0].length);
  }
  rest = rest.trim();
  if (rest.startsWith("-")) {
    negative = !negative;
    rest = rest.slice(1).trim();
  }

  const digits = rest.replace(GROUP_SPACES, "").replace(GROUP_APOSTROPHES, "");
  if (/[ \u00a0\u202f\u2009]/.test(rest) && !/^\d{1,3}([ \u00a0\u202f\u2009]\d{3})*([.,]\d+)?$/.test(rest)) {
    throw new Error(`Not an amount (spaces must separate thousands): "${text}"`);
  }
  const { whole, fraction } = readDecimal(digits, text, options.decimalSeparator, 2);
  const cents = toCents(fraction ? `${whole}.${fraction}` : whole);
  return { cents: negative && cents !== 0 ? -cents : cents, currency, dollarSign };
}

/**
 * Parses a plain number as printed, such as an engine-hour reading "1,412" or "1.412,5".
 * Returns it as a number with at most `maxDecimals` decimals (default 1).
 */
export function parseDocumentNumber(
  text: string,
  options: { decimalSeparator?: DecimalSeparator; maxDecimals?: number } = {},
): number {
  const digits = text.trim().replace(/\s*(h|hrs?|hours?)\.?$/i, "").replace(GROUP_SPACES, "").replace(GROUP_APOSTROPHES, "");
  const { whole, fraction } = readDecimal(digits, text, options.decimalSeparator, options.maxDecimals ?? 1);
  const value = Number(fraction ? `${whole}.${fraction}` : whole);
  if (!Number.isFinite(value) || value > Number.MAX_SAFE_INTEGER) throw new Error(`Number too large: "${text}"`);
  return value;
}

// Month names in the languages boat paperwork in Europe and North America is likely to use,
// accents removed. Abbreviations are matched by prefix (at least three letters).
const MONTHS: [number, string[]][] = [
  [1, ["january", "janvier", "januar", "enero", "gennaio", "januari", "janeiro"]],
  [2, ["february", "fevrier", "februar", "febrero", "febbraio", "februari", "fevereiro"]],
  [3, ["march", "mars", "marz", "maerz", "marzo", "maart", "marco"]],
  [4, ["april", "avril", "abril", "aprile"]],
  [5, ["may", "mai", "mayo", "maggio", "mei", "maio"]],
  [6, ["june", "juin", "juni", "junio", "giugno", "junho"]],
  [7, ["july", "juillet", "juli", "julio", "luglio", "julho"]],
  [8, ["august", "aout", "agosto", "augustus"]],
  [9, ["september", "septembre", "septiembre", "settembre", "setembro"]],
  [10, ["october", "octobre", "oktober", "octubre", "ottobre", "outubro"]],
  [11, ["november", "novembre", "noviembre", "novembro"]],
  [12, ["december", "decembre", "dezember", "diciembre", "dicembre", "dezembro"]],
];

function monthNumber(word: string): number | null {
  const w = word.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\.$/, "");
  if (w.length < 3) return null;
  const found = new Set<number>();
  for (const [n, names] of MONTHS) {
    if (names.some((name) => name === w || (w.length >= 3 && name.startsWith(w)))) found.add(n);
  }
  // "ma" prefixes are ambiguous (mar, mai, may): only an exact or unique match counts.
  return found.size === 1 ? [...found][0]! : null;
}

function isoDate(year: number, month: number, day: number, original: string): string {
  const ms = Date.UTC(year, month - 1, day);
  const d = new Date(ms);
  if (year < 1900 || year > 2200 || d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    throw new Error(`Not a date: "${original}"`);
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Parses a date as printed into YYYY-MM-DD: "2026-10-02", "02.10.2026", "10/02/2026",
 * "2 Oct 2026", "October 2, 2026", "1er octobre 2026", "2. Oktober 2026". All-number dates
 * other than year-first need `order` unless the day is over 12; two-digit years are refused.
 */
export function parseDocumentDate(text: string, options: { order?: DateOrder } = {}): string {
  const t = text.trim().replace(/\s+/g, " ");
  const fail = (why: string): never => {
    throw new Error(`Not a date (${why}): "${text}"`);
  };

  // Year first: 2026-10-02, 2026/10/02, 2026.10.02.
  let m = /^(\d{4})([-/.])(\d{1,2})\2(\d{1,2})$/.exec(t);
  if (m) return isoDate(Number(m[1]), Number(m[3]), Number(m[4]), text);

  // Day and month first, in some order: 02.10.2026, 10/02/2026, 2-10-2026.
  m = /^(\d{1,2})([-/.])(\d{1,2})\2(\d{2,4})\.?$/.exec(t);
  if (m) {
    if (m[4]!.length !== 4) fail("two-digit year");
    const a = Number(m[1]);
    const b = Number(m[3]);
    const year = Number(m[4]);
    let order = options.order;
    if (order === "YMD") fail("the document writes the year first");
    if (!order) {
      if (a > 12 && b <= 12) order = "DMY";
      else if (b > 12 && a <= 12) order = "MDY";
      else if (a === b) order = "DMY";
      else fail("day and month could be either way round");
    }
    return order === "DMY" ? isoDate(year, b, a, text) : isoDate(year, a, b, text);
  }

  // With a month name: "2 Oct 2026", "2nd October 2026", "1er octobre 2026", "2. Oktober 2026",
  // "October 2, 2026", "Oct. 2 2026".
  const words = t.replace(/,/g, " ").split(" ").filter(Boolean);
  if (words.length === 3) {
    const day = (w: string) => {
      const d = /^(\d{1,2})(st|nd|rd|th|er|e|\.|º|o)?$/i.exec(w);
      return d ? Number(d[1]) : null;
    };
    const year = /^\d{4}$/.test(words[2]!) ? Number(words[2]) : null;
    if (year === null) fail("no four-digit year at the end");
    const dayFirst = day(words[0]!);
    const monthSecond = monthNumber(words[1]!);
    if (dayFirst !== null && monthSecond !== null) return isoDate(year!, monthSecond, dayFirst, text);
    const monthFirst = monthNumber(words[0]!);
    const daySecond = day(words[1]!);
    if (monthFirst !== null && daySecond !== null) return isoDate(year!, monthFirst, daySecond, text);
  }
  // "2 de octubre de 2026", "2 de outubro de 2026".
  const de = /^(\d{1,2}) de (\S+) de (\d{4})$/i.exec(t);
  if (de) {
    const month = monthNumber(de[2]!);
    if (month !== null) return isoDate(Number(de[3]), month, Number(de[1]), text);
  }
  return fail("unrecognised format");
}
