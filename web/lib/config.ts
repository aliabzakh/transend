/** Demo defaults from the PRD. Stage 2 serves these from the API and environment. */
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
  duressDefaultUsd: 20,
  shopCashCeilingCad: 500,
  quoteSeconds: 30,
  linesPerCard: 20,
  // Public, non-secret: the deployed escrow on Stellar testnet.
  contractId: "CDOBKIGCORYPODXY2BIDNBV26JG6VG4CLV6KU4FAQR7CTKZ4KQI3KK5U",
} as const;

export const OPEN_DEPARTMENTS = ["Nord-Ouest", "Nord", "Sud"] as const;
export type Department = (typeof OPEN_DEPARTMENTS)[number];

export const explorerContractUrl = `https://stellar.expert/explorer/testnet/contract/${CONFIG.contractId}`;
