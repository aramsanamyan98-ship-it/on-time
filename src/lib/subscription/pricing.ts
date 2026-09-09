// 02_PRD.md Section 14 (final pricing model): a single plan — every paying
// specialist gets identical features. The only variable is commitment
// length, which affects price per month (and the amount billed upfront)
// only.
export const COMMITMENT_MONTHS_OPTIONS = [1, 3, 6, 12] as const;
export type CommitmentMonths = (typeof COMMITMENT_MONTHS_OPTIONS)[number];

export function isCommitmentMonths(value: number): value is CommitmentMonths {
  return (COMMITMENT_MONTHS_OPTIONS as readonly number[]).includes(value);
}

export const SUBSCRIPTION_PRICE_PER_MONTH_AMD: Record<CommitmentMonths, number> = {
  1: 2900,
  3: 2610,
  6: 2320,
  12: 2030,
};

/** Total amount billed upfront for a given commitment length. */
export function totalBilledAmd(months: CommitmentMonths): number {
  return SUBSCRIPTION_PRICE_PER_MONTH_AMD[months] * months;
}
