import { describe, expect, it } from "vitest";
import { restockWindows, type ForecastDay } from "./forecast";
import { STEPS_PER_DAY, simulateWeek, stepToClock, type SimShopInput } from "./simulate";

const TODAY = new Date("2026-11-14T00:00:00Z");
const YESTERDAY = new Date("2026-11-13T00:00:00Z");
const days: ForecastDay[] = Array.from({ length: 7 }, (_, i) => ({
  day: `2026-11-${String(14 + i).padStart(2, "0")}`,
  p10: 140,
  p50: 200,
  p90: 270,
}));
const shop = (id: string, status: SimShopInput["status"] = "calm"): SimShopInput => ({
  id,
  status,
  days,
  restock: restockWindows(id, YESTERDAY, 7),
  hardCapCad: 1000,
});
const cfg = { floorCad: 150, cadToUsd: 0.7077 };

describe("simulateWeek", () => {
  const sim = simulateWeek([shop("S-101"), shop("X-301")], cfg);

  it("covers seven days of 15-minute steps", () => {
    expect(sim.steps).toBe(7 * STEPS_PER_DAY);
    expect(sim.shops[0].cash).toHaveLength(sim.steps);
    expect(stepToClock(0)).toMatchObject({ day: 0, hh: 6, mm: 0 });
    expect(stepToClock(STEPS_PER_DAY)).toMatchObject({ day: 1, hh: 6 });
  });

  it("aligns restock windows with the forecast days", () => {
    expect(restockWindows("S-101", YESTERDAY, 7)[0].day).toBe("2026-11-14");
    expect(TODAY.toISOString().slice(0, 10)).toBe(days[0].day);
  });

  it("never holds more cash than the ceiling, never goes negative, never pays past the ceiling", () => {
    for (const s of sim.shops) {
      s.cash.forEach((c, i) => {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(s.ceiling[i] + 0.01);
      });
      for (const d of s.days) {
        expect(d.paidUsd).toBeLessThanOrEqual(d.ceilingUsd + 0.01);
        expect(d.paidUsd + d.redirectedUsd).toBeCloseTo(d.demandUsd, 1);
      }
    }
  });

  it("is deterministic for the same seed", () => {
    const again = simulateWeek([shop("S-101"), shop("X-301")], cfg);
    expect(again.networkCash).toEqual(sim.networkCash);
    expect(again.topUps).toEqual(sim.topUps);
  });

  it("tops up twice a day and serves most demand under the forecast ceiling", () => {
    expect(sim.topUps.filter((t) => t.shopId === "S-101")).toHaveLength(14);
    expect(sim.totals.servedPct).toBeGreaterThan(90);
    expect(sim.networkPaid.at(-1)).toBeCloseTo(sim.totals.paidUsd, 0);
  });

  it("pays nothing and plans no top-up in a closed area", () => {
    const closed = simulateWeek([shop("S-201", "closed")], cfg);
    expect(closed.totals.paidUsd).toBe(0);
    expect(closed.topUps).toHaveLength(0);
  });
});
