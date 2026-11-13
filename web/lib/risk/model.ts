/**
 * Scores the trained forecast: gradient-boosted quantile regression exported from
 * scikit-learn as plain trees (scripts/ml/train_forecast.py). Pure TypeScript, in
 * process: no Python, no network call and no third-party AI service at runtime.
 */
export type Tree = { l: number[]; r: number[]; f: number[]; t: number[]; v: number[] };
export type QuantileModel = { init: number; lr: number; trees: Tree[] };
export type ForecastModel = {
  version: string;
  features: string[];
  trainedOn: string;
  metrics: { baselineMae: number; modelMae: number; improvementPct: number; holdoutDays: number; chosen: boolean };
  quantiles: { p10: QuantileModel; p50: QuantileModel; p90: QuantileModel };
};

function scoreTree(t: Tree, x: number[]): number {
  let n = 0;
  // A leaf has l[n] === -1. Same split rule as scikit-learn: go left when x <= threshold.
  for (let guard = 0; t.l[n] !== -1; guard++) {
    if (guard > 64) throw new Error("bad tree");
    n = x[t.f[n]] <= t.t[n] ? t.l[n] : t.r[n];
  }
  return t.v[n];
}

export function scoreQuantile(m: QuantileModel, x: number[]): number {
  let y = m.init;
  for (const t of m.trees) y += m.lr * scoreTree(t, x);
  if (!Number.isFinite(y)) throw new Error("model produced a non-number");
  return y;
}

export function isForecastModel(m: unknown): m is ForecastModel {
  const x = m as ForecastModel;
  return !!x && typeof x.version === "string" && !!x.quantiles?.p10 && !!x.quantiles?.p50 && !!x.quantiles?.p90;
}
