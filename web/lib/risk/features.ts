/**
 * Forecast inputs, computed once here and shared by the training export
 * (scripts/ml/export-samples.ts) and live scoring, so the trained model always
 * sees features built exactly the way it was trained on. Numbers only: no names,
 * no IDs of people, no PIN and no code.
 */
import { calendar } from "./sample";

export type DayPoint = { day: string; paidUsd: number; tense?: boolean };

export const FEATURES = [
  "dow",
  "dom",
  "month_start",
  "after_topup",
  "school_fees",
  "year_end",
  "tense",
  "ma7",
  "lag7",
  "waiting_share",
] as const;

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Known demand peaks used by the rules baseline. */
export function peakFactor(d: Date): { factor: number; reason: string | null } {
  const c = calendar(d);
  if (c.schoolFees) return { factor: 1.4, reason: "September school fees" };
  if (c.yearEnd) return { factor: 1.35, reason: "year-end" };
  if (c.monthStart) return { factor: 1.45, reason: "month start" };
  if (c.afterTopup) return { factor: 1.25, reason: "senders' monthly top-ups" };
  return { factor: 1, reason: null };
}

/**
 * Features for `day`, given the payouts before it (oldest first). `waitingUsd` is the
 * liquid money waiting on nearby cards (set-aside money excluded) and `tense` the
 * area status known at forecast time.
 */
export function featuresFor(day: Date, past: number[], waitingUsd: number, tense: boolean): number[] {
  const c = calendar(day);
  const ma7 = mean(past.slice(-7));
  const lag7 = past.length >= 7 ? past[past.length - 7] : ma7;
  // Waiting money relative to a normal week of payouts: more waiting, more demand.
  const waitingShare = ma7 > 0 ? Math.min(5, waitingUsd / (ma7 * 7)) : 0;
  return [c.dow, c.dom, c.monthStart, c.afterTopup, c.schoolFees, c.yearEnd, tense ? 1 : 0, ma7, lag7, waitingShare];
}

/** The rules baseline: a 7-day moving average lifted on known peaks (and dropped when tense). */
export function baselineP50(day: Date, past: number[], tense: boolean): number {
  const base = mean(past.slice(-7)) * peakFactor(day).factor;
  return tense ? base * 0.6 : base;
}
