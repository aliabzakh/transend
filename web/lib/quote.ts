import { CONFIG } from "./config";

export type Quote =
  | { ok: true; amountCad: number; feeCad: number; rate: number; usdOut: number; allInPct: number }
  | { ok: false; reason: "too_small" | "not_a_number" };

/**
 * Flat fee plus an FX markup, paid out in US dollars.
 * all-in cost = fee / amount + markup  (C$200: 1.49/200 + 2.2% = 2.945%)
 */
export function quote(amountCad: number): Quote {
  if (!Number.isFinite(amountCad)) return { ok: false, reason: "not_a_number" };
  if (amountCad < CONFIG.minTopupCad) return { ok: false, reason: "too_small" };
  const rate = CONFIG.demoRateCadUsd * (1 - CONFIG.fxMarkupPct / 100);
  const usdOut = Math.floor((amountCad - CONFIG.flatFeeCad) * rate * 100) / 100;
  const allInPct = (CONFIG.flatFeeCad / amountCad) * 100 + CONFIG.fxMarkupPct;
  return { ok: true, amountCad, feeCad: CONFIG.flatFeeCad, rate, usdOut, allInPct };
}
