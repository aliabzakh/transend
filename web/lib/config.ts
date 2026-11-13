/** Product defaults from the PRD. Public and non-secret, so both apps and the API can read them. */
export const CONFIG = {
  demoRateCadUsd: 0.7077, // labelled "demo rate" in the UI, never presented as live
  fxMarkupPct: 2.2,
  flatFeeCad: 1.49,
  minTopupCad: 100,
  maxPerDayCad: 900,
  maxPerMonthCad: 2000,
  maxCardBalanceUsd: 635,
  maxWithdrawalUsd: 100,
  maxWithdrawalTenseUsd: 50,
  maxWithdrawalsPerDay: 2,
  shopCashCeilingCad: 500,
  quoteSeconds: 30,
  linesPerCard: 20,
  // Savings ("Grow"): demo rate, labelled "demo rate, not guaranteed" on every Grow screen.
  demoApyBps: 400,
  minStakeUsd: 10,
  minLiquidUsd: 100,
  maxStakedTotalUsd: 5000,
  // Shop cash ceiling bounds for the forecast (C$).
  ceilingFloorCad: 150,
  ceilingHardCapCad: 1000,
  maxWrongPins: 5,
  // Public, non-secret: the deployed escrow on Stellar testnet.
  contractId: "CA5VT3QZNJXHWKRWTODIQUANZG2LERIPZNPYXNQWKKL3NTTMHCODBMIT",
} as const;

export const OPEN_DEPARTMENTS = ["Nord-Ouest", "Nord", "Sud"] as const;
export type Department = (typeof OPEN_DEPARTMENTS)[number];

export const EXPLORER = "https://stellar.expert/explorer/testnet";
export const explorerTxUrl = (hash: string) => `${EXPLORER}/tx/${hash}`;
export const explorerContractUrl = `${EXPLORER}/contract/${CONFIG.contractId}`;
