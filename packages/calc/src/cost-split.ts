/**
 * Co-owner cost split: who owes what after shared boat expenses.
 *
 * Remainder rule: each expense is split on its own, in proportion to the ownership shares.
 * Every co-owner first gets the whole cents of their part, rounded down. The cents left over
 * go one at a time to the co-owners with the largest fractional part; ties go to whoever comes
 * first in the shares list. So every expense splits into parts that add up to its amount
 * exactly, and the same input always gives the same result.
 */

export interface Expense {
  /** Integer cents. A refund or credit is negative. */
  amountCents: number;
  /** The co-owner who paid it. */
  paidBy: string;
  /** Calendar date, YYYY-MM-DD. Carried for traceability; the split does not depend on it. */
  date: string;
}

export interface OwnershipShare {
  owner: string;
  /** A positive whole number. Only the ratio matters: 50/30/20 and 5/3/2 split the same way. */
  share: number;
}

export interface CoOwnerBalance {
  owner: string;
  /** What this co-owner paid, in cents. */
  paidCents: number;
  /** Their part of all the expenses, in cents. */
  shareCents: number;
  /** paidCents − shareCents: positive means they are owed money, negative means they owe. */
  balanceCents: number;
}

/**
 * Splits expenses between co-owners by ownership share and returns each co-owner's balance,
 * in the order of `shares`. The balances always add up to zero.
 */
export function splitCosts(expenses: Expense[], shares: OwnershipShare[]): CoOwnerBalance[] {
  validateShares(shares);
  const totalShares = shares.reduce((sum, s) => sum + s.share, 0);
  const balances = shares.map((s) => ({ owner: s.owner, paidCents: 0, shareCents: 0, balanceCents: 0 }));
  const indexOf = new Map(shares.map((s, i) => [s.owner, i]));

  for (const expense of expenses) {
    if (!Number.isSafeInteger(expense.amountCents)) {
      throw new Error(`Not a whole number of cents: ${expense.amountCents}`);
    }
    const payer = indexOf.get(expense.paidBy);
    if (payer === undefined) {
      throw new Error(`Paid by someone who is not a co-owner: "${expense.paidBy}"`);
    }
    balances[payer]!.paidCents += expense.amountCents;
    const parts = splitAmount(expense.amountCents, shares, totalShares);
    parts.forEach((part, i) => {
      balances[i]!.shareCents += part;
    });
  }

  for (const b of balances) {
    b.balanceCents = b.paidCents - b.shareCents;
  }
  return balances;
}

/** Splits one amount by shares with the remainder rule above. Negative amounts split as their mirror image. */
function splitAmount(amountCents: number, shares: OwnershipShare[], totalShares: number): number[] {
  const sign = amountCents < 0 ? -1 : 1;
  const amount = Math.abs(amountCents);
  const parts = shares.map((s) => {
    const exact = amount * s.share;
    if (!Number.isSafeInteger(exact)) {
      throw new Error(`Amount too large to split: ${amountCents}`);
    }
    return { whole: Math.floor(exact / totalShares), remainder: exact % totalShares };
  });

  let left = amount - parts.reduce((sum, p) => sum + p.whole, 0);
  const byRemainder = parts
    .map((p, i) => ({ i, remainder: p.remainder }))
    .sort((a, b) => b.remainder - a.remainder || a.i - b.i);
  for (const { i } of byRemainder) {
    if (left === 0) break;
    parts[i]!.whole += 1;
    left -= 1;
  }

  // Adding 0 turns -0 into 0, so a refund's zero parts compare equal to 0.
  return parts.map((p) => sign * p.whole + 0);
}

function validateShares(shares: OwnershipShare[]): void {
  if (shares.length === 0) {
    throw new Error("No co-owners to split between");
  }
  const seen = new Set<string>();
  for (const s of shares) {
    if (!Number.isSafeInteger(s.share) || s.share <= 0) {
      throw new Error(`Share must be a positive whole number: ${s.owner} has ${s.share}`);
    }
    if (seen.has(s.owner)) {
      throw new Error(`Co-owner listed twice: "${s.owner}"`);
    }
    seen.add(s.owner);
  }
}
