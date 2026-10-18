import { describe, expect, it } from "vitest";
import { splitCosts, type Expense, type OwnershipShare } from "./cost-split";

const equalThirds: OwnershipShare[] = [
  { owner: "ana", share: 1 },
  { owner: "ben", share: 1 },
  { owner: "cleo", share: 1 },
];

function expense(amountCents: number, paidBy: string, date = "2026-05-01"): Expense {
  return { amountCents, paidBy, date };
}

describe("splitCosts", () => {
  it("splits 3 ways with a remainder, the extra cent going to the first in the list", () => {
    const result = splitCosts([expense(100, "ana")], equalThirds);
    expect(result).toEqual([
      { owner: "ana", paidCents: 100, shareCents: 34, balanceCents: 66 },
      { owner: "ben", paidCents: 0, shareCents: 33, balanceCents: -33 },
      { owner: "cleo", paidCents: 0, shareCents: 33, balanceCents: -33 },
    ]);
  });

  it("gives two leftover cents to the first two in the list", () => {
    const result = splitCosts([expense(101, "ben")], equalThirds);
    expect(result.map((b) => b.shareCents)).toEqual([34, 34, 33]);
  });

  it("splits by unequal shares", () => {
    const shares = [
      { owner: "ana", share: 50 },
      { owner: "ben", share: 30 },
      { owner: "cleo", share: 20 },
    ];
    const result = splitCosts([expense(123_45, "cleo")], shares);
    // Exact parts: 6172.5, 3703.5, 2469 → the half cents' leftover goes to ana (first of the tie).
    expect(result).toEqual([
      { owner: "ana", paidCents: 0, shareCents: 6173, balanceCents: -6173 },
      { owner: "ben", paidCents: 0, shareCents: 3703, balanceCents: -3703 },
      { owner: "cleo", paidCents: 12345, shareCents: 2469, balanceCents: 9876 },
    ]);
  });

  it("gives leftover cents to the largest fractional part, not just the first owner", () => {
    // 10 cents split 1:2 → exact 3.33 and 6.67; the cent goes to the second owner.
    const result = splitCosts(
      [expense(10, "a")],
      [
        { owner: "a", share: 1 },
        { owner: "b", share: 2 },
      ],
    );
    expect(result.map((b) => b.shareCents)).toEqual([3, 7]);
  });

  it("handles one owner paying everything over several expenses", () => {
    const expenses = [expense(250_00, "ana", "2026-03-02"), expense(1_199_99, "ana", "2026-04-15"), expense(80_00, "ana")];
    const result = splitCosts(expenses, equalThirds);
    // 25000 → 8334/8333/8333, 119999 → 40000/40000/39999, 8000 → 2667/2667/2666.
    expect(result).toEqual([
      { owner: "ana", paidCents: 152999, shareCents: 51001, balanceCents: 101998 },
      { owner: "ben", paidCents: 0, shareCents: 51000, balanceCents: -51000 },
      { owner: "cleo", paidCents: 0, shareCents: 50998, balanceCents: -50998 },
    ]);
  });

  it("splits each expense on its own, so leftover cents can add up", () => {
    // 3 × 100 cents: ana gets the extra cent each time, rather than 300 split once (100 each).
    const result = splitCosts([expense(100, "ben"), expense(100, "ben"), expense(100, "ben")], equalThirds);
    expect(result.map((b) => b.shareCents)).toEqual([102, 99, 99]);
  });

  it("splits a refund as the mirror image of a payment", () => {
    const result = splitCosts([expense(100, "ana"), expense(-100, "ana")], equalThirds);
    expect(result).toEqual([
      { owner: "ana", paidCents: 0, shareCents: 0, balanceCents: 0 },
      { owner: "ben", paidCents: 0, shareCents: 0, balanceCents: 0 },
      { owner: "cleo", paidCents: 0, shareCents: 0, balanceCents: 0 },
    ]);
  });

  it("treats shares as a ratio", () => {
    const expenses = [expense(9_999, "ana"), expense(1, "ben"), expense(77_777, "cleo")];
    const percent = splitCosts(expenses, [
      { owner: "ana", share: 50 },
      { owner: "ben", share: 30 },
      { owner: "cleo", share: 20 },
    ]);
    const reduced = splitCosts(expenses, [
      { owner: "ana", share: 5 },
      { owner: "ben", share: 3 },
      { owner: "cleo", share: 2 },
    ]);
    expect(reduced).toEqual(percent);
  });

  it("returns all zeros with no expenses", () => {
    expect(splitCosts([], equalThirds).every((b) => b.balanceCents === 0 && b.shareCents === 0)).toBe(true);
  });

  it("always splits every expense exactly, and balances add up to zero", () => {
    const shares = [
      { owner: "a", share: 7 },
      { owner: "b", share: 11 },
      { owner: "c", share: 13 },
      { owner: "d", share: 1 },
    ];
    for (let amount = -500; amount <= 5000; amount += 37) {
      const result = splitCosts([expense(amount, "c")], shares);
      expect(result.reduce((sum, b) => sum + b.shareCents, 0)).toBe(amount);
      expect(result.reduce((sum, b) => sum + b.balanceCents, 0)).toBe(0);
    }
  });

  it("rejects a payer who is not a co-owner", () => {
    expect(() => splitCosts([expense(100, "dan")], equalThirds)).toThrow(/not a co-owner/);
  });

  it("rejects fractional cents", () => {
    expect(() => splitCosts([expense(10.5, "ana")], equalThirds)).toThrow(/whole number of cents/);
  });

  it.each([
    ["no co-owners", []],
    ["a zero share", [{ owner: "ana", share: 0 }]],
    ["a negative share", [{ owner: "ana", share: -1 }]],
    ["a fractional share", [{ owner: "ana", share: 0.5 }]],
    [
      "the same co-owner twice",
      [
        { owner: "ana", share: 1 },
        { owner: "ana", share: 1 },
      ],
    ],
  ])("rejects %s", (_, shares) => {
    expect(() => splitCosts([], shares)).toThrow();
  });

  it("rejects an amount too large to split exactly", () => {
    expect(() =>
      splitCosts([expense(Number.MAX_SAFE_INTEGER, "ana")], [{ owner: "ana", share: 3 }]),
    ).toThrow(/too large/);
  });
});
