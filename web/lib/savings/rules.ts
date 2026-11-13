/**
 * Savings ("Grow" on screen) rules, checked before anything goes on-chain so the
 * sender gets a plain reason. The contract enforces the same rules again.
 */
export type SavingsLimits = {
  minStakeUsd: number;
  minLiquidUsd: number;
  maxStakedTotalUsd: number;
  stakedTotalUsd: number;
  stakingPaused: boolean;
};

export type CardMoney = { status: "Pending" | "Active" | "Frozen" | "Retired"; balanceUsd: number; stakedUsd: number };

export type StakeRefusal =
  | "bad_amount"
  | "card_not_active"
  | "staking_paused"
  | "below_min"
  | "below_floor"
  | "over_total_cap";
export type UnstakeRefusal = "bad_amount" | "card_retired" | "more_than_set_aside";

const cents = (n: number) => Math.round(n * 100) / 100;

export function liquidUsd(card: CardMoney): number {
  return cents(card.balanceUsd - card.stakedUsd);
}

export function checkStake(card: CardMoney, amountUsd: number, l: SavingsLimits): StakeRefusal | null {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return "bad_amount";
  if (card.status !== "Active") return "card_not_active";
  if (l.stakingPaused) return "staking_paused";
  if (amountUsd < l.minStakeUsd) return "below_min";
  if (cents(liquidUsd(card) - amountUsd) < l.minLiquidUsd) return "below_floor";
  if (cents(l.stakedTotalUsd + amountUsd) > l.maxStakedTotalUsd) return "over_total_cap";
  return null;
}

/** Moving back is always allowed (even on a frozen card or while paused), up to what is set aside. */
export function checkUnstake(card: CardMoney, amountUsd: number): UnstakeRefusal | null {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return "bad_amount";
  if (card.status === "Retired") return "card_retired";
  if (amountUsd > card.stakedUsd + 1e-9) return "more_than_set_aside";
  return null;
}

/** The most that can be set aside now while keeping the liquid floor. */
export function maxStakeUsd(card: CardMoney, l: SavingsLimits): number {
  const byFloor = liquidUsd(card) - l.minLiquidUsd;
  const byCap = l.maxStakedTotalUsd - l.stakedTotalUsd;
  return Math.max(0, cents(Math.min(byFloor, byCap)));
}

/** About how much a year at the demo rate. */
export const yearlyYieldUsd = (amountUsd: number, apyBps: number) => cents((amountUsd * apyBps) / 10_000);

/** The Savings view always adds up: available + set aside = total. */
export function savingsSplit(card: CardMoney) {
  const setAside = cents(card.stakedUsd);
  const total = cents(card.balanceUsd);
  return { availableUsd: cents(total - setAside), setAsideUsd: setAside, totalUsd: total };
}
