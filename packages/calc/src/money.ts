/**
 * Money is handled as integer cents so sums and splits are exact.
 */

/**
 * Parses a decimal amount such as "1234.5", "-12.30" or "1,234.56" into integer cents.
 * Throws on anything that is not a plain amount with at most two decimals, so a bad value
 * from a document is rejected instead of being saved wrong.
 */
export function toCents(amount: string): number {
  const cleaned = amount.trim().replace(/,(?=\d{3}(\D|$))/g, "");
  const match = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) {
    throw new Error(`Not an amount: "${amount}"`);
  }
  const [, sign, whole, fraction = ""] = match;
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) {
    throw new Error(`Amount too large: "${amount}"`);
  }
  return sign && cents !== 0 ? -cents : cents;
}

/** Formats integer cents as a plain decimal string, for example 123456 → "1234.56". */
export function formatCents(cents: number): string {
  if (!Number.isSafeInteger(cents)) {
    throw new Error(`Not a whole number of cents: ${cents}`);
  }
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
