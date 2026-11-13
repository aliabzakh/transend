import { describe, expect, it } from "vitest";
import { checkStake, checkUnstake, maxStakeUsd, savingsSplit, yearlyYieldUsd, type SavingsLimits } from "./rules";

const L: SavingsLimits = {
  minStakeUsd: 10,
  minLiquidUsd: 100,
  maxStakedTotalUsd: 5000,
  stakedTotalUsd: 0,
  stakingPaused: false,
};
const card = { status: "Active" as const, balanceUsd: 300, stakedUsd: 0 };

describe("Savings rules", () => {
  it("refuses amounts below the US$10 minimum with a plain reason", () => {
    expect(checkStake(card, 9.99, L)).toBe("below_min");
    expect(checkStake(card, 10, L)).toBeNull();
  });

  it("keeps at least US$100 available", () => {
    expect(checkStake(card, 200, L)).toBeNull();
    expect(checkStake(card, 200.01, L)).toBe("below_floor");
    expect(maxStakeUsd(card, L)).toBe(200);
  });

  it("respects the total cap and the kill switch", () => {
    expect(checkStake(card, 50, { ...L, stakedTotalUsd: 4960 })).toBe("over_total_cap");
    expect(checkStake(card, 50, { ...L, stakingPaused: true })).toBe("staking_paused");
  });

  it("only an active card can set money aside, but a frozen card can move it back", () => {
    expect(checkStake({ ...card, status: "Frozen" }, 50, L)).toBe("card_not_active");
    expect(checkUnstake({ ...card, status: "Frozen", stakedUsd: 50 }, 50)).toBeNull();
    expect(checkUnstake({ ...card, stakedUsd: 50 }, 50.01)).toBe("more_than_set_aside");
    expect(checkUnstake(card, 0)).toBe("bad_amount");
  });

  it("available + set aside = total, always", () => {
    for (const [b, s] of [
      [300, 0],
      [300, 199.99],
      [137.39, 37.39],
      [635.0000001, 100],
    ]) {
      const v = savingsSplit({ status: "Active", balanceUsd: b, stakedUsd: s });
      expect(Math.round((v.availableUsd + v.setAsideUsd) * 100)).toBe(Math.round(v.totalUsd * 100));
    }
  });

  it("previews the yearly yield at the demo rate", () => {
    expect(yearlyYieldUsd(200, 400)).toBe(8);
  });
});
