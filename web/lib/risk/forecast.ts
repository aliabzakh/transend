/**
 * The AI prediction system: how much cash each shop will pay out over the coming
 * week. It sets the shop's cash ceiling (only between a floor and the admin's hard
 * cap) and its restock windows. It never approves or refuses a payout and never
 * loosens a contract limit. Pure functions; the server feeds them data.
 */
import { FEATURES, baselineP50, featuresFor, mean, peakFactor, type DayPoint } from "./features";
import { hashStr, isoDay, mulberry32 } from "./sample";
import { scoreQuantile, type ForecastModel } from "./model";

export type { DayPoint } from "./features";
export type Forecaster = "rules" | "model";
export type ForecastDay = { day: string; p10: number; p50: number; p90: number };
export type RestockDay = { day: string; windows: string[] };
export type ShopForecast = {
  days: ForecastDay[];
  suggestedCeilingCad: number;
  restock: RestockDay[];
  reason: string;
  forecaster: Forecaster;
  modelVersion: string;
};

export type ForecastInput = {
  shopId: string;
  /** Daily payouts, oldest first, ending yesterday. */
  history: DayPoint[];
  today: Date;
  /** Liquid money waiting on nearby cards. Money set aside in Savings must not be included. */
  waitingUsd: number;
  tense: boolean;
  /** Senders who usually top up within the coming week. */
  toppingUpSenders?: number;
  horizonDays?: number;
  floorCad: number;
  hardCapCad: number;
  cadToUsd: number;
  /** "model" only takes effect when a model is given and it beat the baseline. */
  mode: Forecaster;
  model?: ForecastModel | null;
};

const r2 = (n: number) => Math.round(n * 100) / 100;
const addDays = (d: Date, n: number) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));

/** The model replaces the rules only if it beat them by at least 10% on held-out data. */
export function chooseForecaster(mode: Forecaster, model: ForecastModel | null | undefined): Forecaster {
  if (mode !== "model" || !model) return "rules";
  return model.metrics.chosen && model.metrics.improvementPct >= 10 ? "model" : "rules";
}

/** Money waiting to be collected: liquid balances only. Set-aside (Savings) money cannot be collected. */
export function waitingBalanceUsd(cards: { balanceUsd: number; stakedUsd: number }[]): number {
  return r2(cards.reduce((sum, c) => sum + Math.max(0, c.balanceUsd - c.stakedUsd), 0));
}

/** clamp(p90 x 1.1, floor, hard cap), in C$. */
export function ceilingFromP90(p90Usd: number, cadToUsd: number, floorCad: number, hardCapCad: number): number {
  const cad = (p90Usd * 1.1) / cadToUsd;
  return Math.round(Math.min(hardCapCad, Math.max(floorCad, cad)));
}

/** Empirical spread of actual / baseline over recent days, for the rules band. */
function baselineSpread(history: DayPoint[]): { lo: number; hi: number } {
  const ratios: number[] = [];
  for (let i = Math.max(7, history.length - 28); i < history.length; i++) {
    const past = history.slice(0, i).map((p) => p.paidUsd);
    const pred = baselineP50(new Date(`${history[i].day}T00:00:00Z`), past, !!history[i].tense);
    if (pred > 0) ratios.push(history[i].paidUsd / pred);
  }
  if (ratios.length < 5) return { lo: 0.75, hi: 1.25 };
  ratios.sort((a, b) => a - b);
  const q = (p: number) => ratios[Math.min(ratios.length - 1, Math.max(0, Math.round(p * (ratios.length - 1))))];
  return { lo: Math.min(0.9, q(0.1)), hi: Math.max(1.1, q(0.9)) };
}

/**
 * Two restock windows a day (morning, afternoon), from a seeded generator. A slot
 * never starts in the same hour two days running, so cash movement is not predictable.
 */
export function restockWindows(shopId: string, today: Date, days: number): RestockDay[] {
  const slots: [number, number][] = [
    [7, 11],
    [13, 17],
  ];
  const out: RestockDay[] = [];
  let prev = slots.map(() => -1);
  for (let i = 0; i <= days; i++) {
    const d = addDays(today, i);
    const rand = mulberry32(hashStr(`restock:${shopId}:${isoDay(d)}`));
    const hours = slots.map(([from, to], k) => {
      let h = from + Math.floor(rand() * (to - from));
      if (h === prev[k]) h = h + 1 < to ? h + 1 : from;
      return h;
    });
    const windows = hours.map((h) => {
      const m = [0, 15, 30, 45][Math.floor(rand() * 4)];
      const p = (n: number) => String(n).padStart(2, "0");
      return `${p(h)}:${p(m)}-${p(h + 1)}:${p(m)}`;
    });
    prev = hours;
    if (i > 0) out.push({ day: isoDay(d), windows });
  }
  return out;
}

const DOW_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function reasonLine(days: ForecastDay[], history: DayPoint[], toppingUp: number): string {
  const typical = mean(history.slice(-28).map((p) => p.paidUsd));
  const peak = days.reduce((a, b) => (b.p50 > a.p50 ? b : a), days[0]);
  const d = new Date(`${peak.day}T00:00:00Z`);
  const why: string[] = [];
  const pf = peakFactor(d).reason;
  if (pf) why.push(pf);
  if (d.getUTCDay() === 6) why.push("Saturday market");
  if (toppingUp > 0) why.push(`${toppingUp} sender${toppingUp === 1 ? "" : "s"} top up this week`);
  if (peak.p50 > typical * 1.15 && why.length) return `Higher on ${DOW_NAMES[d.getUTCDay()]} ${peak.day.slice(5)}: ${why.join(", ")}`;
  return `Steady: about US$${Math.round(mean(days.map((x) => x.p50)))} a day${why.length ? ` (${why.join(", ")})` : ""}`;
}

function predictDay(
  forecaster: Forecaster,
  model: ForecastModel | null | undefined,
  day: Date,
  past: number[],
  input: ForecastInput,
  spread: { lo: number; hi: number },
): { p10: number; p50: number; p90: number } {
  if (forecaster === "model" && model) {
    const x = featuresFor(day, past, input.waitingUsd, input.tense);
    const q = [scoreQuantile(model.quantiles.p10, x), scoreQuantile(model.quantiles.p50, x), scoreQuantile(model.quantiles.p90, x)]
      .map((v) => Math.max(0, v))
      .sort((a, b) => a - b);
    return { p10: q[0], p50: q[1], p90: q[2] };
  }
  const p50 = Math.max(baselineP50(day, past, input.tense), input.waitingUsd * 0.1 / 7);
  return { p10: p50 * spread.lo, p50, p90: p50 * spread.hi };
}

export function forecastShop(input: ForecastInput): ShopForecast {
  const horizon = input.horizonDays ?? 7;
  let forecaster = chooseForecaster(input.mode, input.model);
  const spread = baselineSpread(input.history);

  const run = (f: Forecaster): ForecastDay[] => {
    const past = input.history.map((p) => p.paidUsd);
    const days: ForecastDay[] = [];
    for (let i = 0; i < horizon; i++) {
      const d = addDays(input.today, i);
      const q = predictDay(f, input.model, d, past, input, spread);
      days.push({ day: isoDay(d), p10: r2(q.p10), p50: r2(q.p50), p90: r2(q.p90) });
      past.push(q.p50); // multi-step: the forecast feeds the next day's lags
    }
    return days;
  };

  let days: ForecastDay[];
  try {
    days = run(forecaster);
  } catch {
    // Fail simple: if the trained model errors, the rules baseline is used.
    forecaster = "rules";
    days = run("rules");
  }

  return {
    days,
    suggestedCeilingCad: ceilingFromP90(days[0].p90, input.cadToUsd, input.floorCad, input.hardCapCad),
    restock: restockWindows(input.shopId, input.today, horizon),
    reason: reasonLine(days, input.history, input.toppingUpSenders ?? 0),
    forecaster,
    modelVersion: forecaster === "model" && input.model ? input.model.version : "rules-ma7-v1",
  };
}

export { FEATURES };
