import { describe, expect, it } from "vitest";
import modelJson from "./model.json";
import { baselineP50 } from "./features";
import {
  ceilingFromP90,
  chooseForecaster,
  forecastShop,
  restockWindows,
  waitingBalanceUsd,
  type DayPoint,
  type ForecastInput,
} from "./forecast";
import { scoreQuantile, type ForecastModel } from "./model";
import { sampleHistory } from "./sample";

const model = modelJson as unknown as ForecastModel;
const TODAY = new Date("2026-11-13T00:00:00Z");
const history: DayPoint[] = sampleHistory("S-101", TODAY, 60).map((d) => ({
  day: d.day,
  paidUsd: d.paidUsd,
  tense: d.areaStatus === "tense",
}));
const base: ForecastInput = {
  shopId: "S-101",
  history,
  today: TODAY,
  waitingUsd: 400,
  tense: false,
  floorCad: 150,
  hardCapCad: 1000,
  cadToUsd: 0.7077,
  mode: "rules",
  model,
};

describe("rules baseline", () => {
  it("is the 7-day moving average lifted on known peaks", () => {
    const past = [10, 20, 30, 40, 50, 60, 70, 999];
    const lastSeven = [20, 30, 40, 50, 60, 70, 999];
    const avg = lastSeven.reduce((a, b) => a + b) / 7;
    // A plain Wednesday: no lift.
    expect(baselineP50(new Date("2026-11-11T00:00:00Z"), past, false)).toBeCloseTo(avg, 6);
    // December 1st: month start, x1.45.
    expect(baselineP50(new Date("2026-12-01T00:00:00Z"), past, false)).toBeCloseTo(avg * 1.45, 6);
    // September 10th: school fees, x1.4.
    expect(baselineP50(new Date("2026-09-10T00:00:00Z"), past, false)).toBeCloseTo(avg * 1.4, 6);
    // A tense area drops it.
    expect(baselineP50(new Date("2026-11-11T00:00:00Z"), past, true)).toBeCloseTo(avg * 0.6, 6);
  });
});

describe("forecaster choice", () => {
  it("uses the model only when it beats the baseline by at least 10% on held-out data", () => {
    const m = (improvementPct: number, chosen: boolean) =>
      ({ ...model, metrics: { ...model.metrics, improvementPct, chosen } }) as ForecastModel;
    expect(chooseForecaster("model", m(57, true))).toBe("model");
    expect(chooseForecaster("model", m(9.9, false))).toBe("rules");
    expect(chooseForecaster("model", m(12, false))).toBe("rules");
    expect(chooseForecaster("rules", m(57, true))).toBe("rules");
    expect(chooseForecaster("model", null)).toBe("rules");
  });

  it("falls back to the baseline when the model errors", () => {
    const broken = {
      ...model,
      metrics: { ...model.metrics, chosen: true, improvementPct: 50 },
      quantiles: { ...model.quantiles, p50: { init: Number.NaN, lr: 0.1, trees: [] } },
    } as ForecastModel;
    const f = forecastShop({ ...base, mode: "model", model: broken });
    expect(f.forecaster).toBe("rules");
    expect(f.days).toHaveLength(7);
  });

  it("scores the exported trees", () => {
    const x = [3, 13, 0, 0, 0, 0, 0, 60, 55, 1];
    const y = scoreQuantile(model.quantiles.p50, x);
    expect(Number.isFinite(y)).toBe(true);
  });
});

describe("cash ceiling", () => {
  it("is never above the admin cap or below the floor", () => {
    expect(ceilingFromP90(0, 0.7077, 150, 1000)).toBe(150);
    expect(ceilingFromP90(10_000, 0.7077, 150, 1000)).toBe(1000);
    expect(ceilingFromP90(200, 0.7077, 150, 1000)).toBe(Math.round((200 * 1.1) / 0.7077));
    for (const mode of ["rules", "model"] as const) {
      for (const cap of [200, 500, 1000]) {
        const f = forecastShop({ ...base, mode, hardCapCad: cap });
        expect(f.suggestedCeilingCad).toBeLessThanOrEqual(cap);
        expect(f.suggestedCeilingCad).toBeGreaterThanOrEqual(150);
      }
    }
  });

  it("gives an ordered band and a reason line", () => {
    const f = forecastShop({ ...base, mode: "model" });
    expect(f.forecaster).toBe("model");
    for (const d of f.days) {
      expect(d.p10).toBeLessThanOrEqual(d.p50);
      expect(d.p50).toBeLessThanOrEqual(d.p90);
    }
    expect(f.reason.length).toBeGreaterThan(5);
  });
});

describe("restock windows", () => {
  it("never start in the same hour on consecutive days", () => {
    for (const shop of ["S-101", "S-102", "S-201", "S-999"]) {
      const w = restockWindows(shop, TODAY, 60);
      for (let i = 1; i < w.length; i++) {
        for (let k = 0; k < 2; k++) {
          expect(w[i].windows[k].slice(0, 2)).not.toBe(w[i - 1].windows[k].slice(0, 2));
        }
      }
    }
  });
});

describe("waiting balances", () => {
  it("exclude money set aside in Savings", () => {
    expect(
      waitingBalanceUsd([
        { balanceUsd: 300, stakedUsd: 200 },
        { balanceUsd: 137.39, stakedUsd: 0 },
      ]),
    ).toBe(237.39);
  });
});
