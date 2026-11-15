/**
 * Seven-day cash simulation for the operations view. Given each shop's forecast band,
 * cash ceiling rule and restock windows, it plays the week forward in 15-minute steps:
 * demand is drawn from the forecast band (seeded, so every run is the same), payouts
 * drain the shop's cash, and in each restock window the shopkeeper tops her cash back
 * up to the day's ceiling herself, from her own sales or her MonCash or Fonkoze account.
 * Nobody delivers cash. Payouts stop at the ceiling; what does not fit is redirected to
 * the next shop. The same demand is replayed under a flat C$500 ceiling for comparison.
 *
 * It is a simulation of what the forecast plans, not a record of what happened.
 */
import { ceilingFromP90, type ForecastDay, type RestockDay } from "./forecast";
import { hashStr, mulberry32 } from "./sample";
import type { AreaStatus } from "./network";

export const OPEN_MIN = 6 * 60; // the simulated day runs 06:00 to 20:00
export const CLOSE_MIN = 20 * 60;
export const STEP_MIN = 15;
export const STEPS_PER_DAY = (CLOSE_MIN - OPEN_MIN) / STEP_MIN;
export const FLAT_CEILING_CAD = 500;

/** Share of a day's payouts in each hour, 07:00 to 18:00 (market morning, second wave after lunch). */
const HOURLY: Record<number, number> = {
  7: 0.05, 8: 0.09, 9: 0.12, 10: 0.13, 11: 0.11, 12: 0.07, 13: 0.08, 14: 0.1, 15: 0.1, 16: 0.08, 17: 0.05, 18: 0.02,
};

export type SimShopInput = {
  id: string;
  status: AreaStatus;
  days: ForecastDay[];
  /** Restock windows aligned with `days` (same dates). */
  restock: RestockDay[];
  hardCapCad: number;
};

export type SimConfig = { floorCad: number; cadToUsd: number; seed?: string };

/** The shopkeeper topping up her payout cash during a restock window (from `startStep`, done at `endStep`). */
export type TopUp = { shopId: string; day: number; startStep: number; endStep: number; amountUsd: number };

export type SimShopDay = {
  day: string;
  ceilingCad: number;
  ceilingUsd: number;
  demandUsd: number;
  paidUsd: number;
  redirectedUsd: number;
};

export type SimShop = {
  id: string;
  /** Cash in the shop at the end of each step, US$. */
  cash: number[];
  /** Ceiling in force at each step, US$. */
  ceiling: number[];
  /** Paid out since the start of the week, at the end of each step, US$. */
  paidCum: number[];
  days: SimShopDay[];
  avgCashUsd: number;
  servedPct: number;
};

export type SimResult = {
  steps: number;
  shops: SimShop[];
  topUps: TopUp[];
  /** Cash across the whole network at the end of each step, US$. */
  networkCash: number[];
  /** Paid out across the network since the start of the week, US$. */
  networkPaid: number[];
  totals: {
    demandUsd: number;
    paidUsd: number;
    redirectedUsd: number;
    servedPct: number;
    avgCashUsd: number;
    topUps: number;
    shopDaysRedirected: number;
  };
  flat: { avgCashUsd: number; servedPct: number; redirectedUsd: number };
};

export const stepToClock = (step: number) => {
  const day = Math.floor(step / STEPS_PER_DAY);
  const min = OPEN_MIN + (step % STEPS_PER_DAY) * STEP_MIN;
  return { day, min, hh: Math.floor(min / 60), mm: min % 60 };
};

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const minToStep = (day: number, min: number) => day * STEPS_PER_DAY + Math.round((min - OPEN_MIN) / STEP_MIN);

/** A day's demand drawn from the forecast band: p50 with a split-normal spread fitted to p10 and p90. */
function drawDemand(d: ForecastDay, rand: () => number): number {
  const u1 = Math.max(1e-9, rand());
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * rand());
  const sigma = (z < 0 ? d.p50 - d.p10 : d.p90 - d.p50) / 1.2816;
  return Math.max(0, d.p50 + z * sigma);
}

type Plan = { demand: number[]; perStep: number[][]; arrivals: { step: number; start: number; day: number }[] };

function plan(shop: SimShopInput, seed: string): Plan {
  const nDays = shop.days.length;
  const demand: number[] = [];
  const perStep: number[][] = [];
  const arrivals: Plan["arrivals"] = [];
  for (let i = 0; i < nDays; i++) {
    const rand = mulberry32(hashStr(`sim:${seed}:${shop.id}:${shop.days[i].day}`));
    const total = shop.status === "closed" ? 0 : drawDemand(shop.days[i], rand);
    demand.push(total);
    // Hourly shape with some step-to-step noise, scaled so the steps add up to the day's demand.
    const weights = Array.from({ length: STEPS_PER_DAY }, (_, s) => {
      const h = Math.floor((OPEN_MIN + s * STEP_MIN) / 60);
      return (HOURLY[h] ?? 0) * (0.75 + 0.5 * rand());
    });
    const wSum = weights.reduce((x, y) => x + y, 0) || 1;
    perStep.push(weights.map((w) => (total * w) / wSum));
    if (shop.status !== "closed") {
      for (const w of shop.restock[i]?.windows ?? []) {
        const [from, to] = w.split("-").map(toMin);
        arrivals.push({ day: i, start: minToStep(i, from), step: minToStep(i, to) });
      }
    }
  }
  arrivals.sort((a, b) => a.step - b.step);
  return { demand, perStep, arrivals };
}

function run(shop: SimShopInput, p: Plan, ceilingsUsd: number[]) {
  const nDays = shop.days.length;
  const cash: number[] = [];
  const ceiling: number[] = [];
  const paidCum: number[] = [];
  let paidSoFar = 0;
  const topUps: Omit<TopUp, "shopId">[] = [];
  const paid = new Array(nDays).fill(0);
  const redirected = new Array(nDays).fill(0);
  let drawer = 0.6 * ceilingsUsd[0];
  let a = 0;
  for (let i = 0; i < nDays; i++) {
    for (let s = 0; s < STEPS_PER_DAY; s++) {
      const step = i * STEPS_PER_DAY + s;
      // A top-up finishing in this step brings the cash back up to today's ceiling.
      while (a < p.arrivals.length && p.arrivals[a].step <= step) {
        const arr = p.arrivals[a++];
        const amount = Math.max(0, ceilingsUsd[arr.day] - drawer);
        drawer += amount;
        topUps.push({ day: arr.day, startStep: arr.start, endStep: arr.step, amountUsd: Math.round(amount * 100) / 100 });
      }
      const want = p.perStep[i][s];
      const room = Math.max(0, ceilingsUsd[i] - paid[i]);
      const served = Math.min(want, drawer, room);
      drawer -= served;
      paid[i] += served;
      paidSoFar += served;
      paidCum.push(paidSoFar);
      redirected[i] += want - served;
      cash.push(drawer);
      ceiling.push(ceilingsUsd[i]);
    }
  }
  return { cash, ceiling, paidCum, topUps, paid, redirected };
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const r2 = (n: number) => Math.round(n * 100) / 100;

export function simulateWeek(input: SimShopInput[], cfg: SimConfig): SimResult {
  const seed = cfg.seed ?? "ops";
  const nDays = input[0]?.days.length ?? 0;
  const steps = nDays * STEPS_PER_DAY;
  const shops: SimShop[] = [];
  const topUps: TopUp[] = [];
  const networkCash = new Array(steps).fill(0);
  const networkPaid = new Array(steps).fill(0);
  let demandAll = 0, paidAll = 0, cashAll = 0, shopDaysRedirected = 0;
  let flatPaid = 0, flatCash = 0;
  const flatUsd = FLAT_CEILING_CAD * cfg.cadToUsd;

  for (const shop of input) {
    const p = plan(shop, seed);
    const ceilCad = shop.days.map((d) => ceilingFromP90(d.p90, cfg.cadToUsd, cfg.floorCad, shop.hardCapCad));
    const ceilUsd = ceilCad.map((c) => c * cfg.cadToUsd);
    const r = run(shop, p, ceilUsd);
    const flat = run(shop, p, new Array(nDays).fill(flatUsd));
    r.cash.forEach((c, i) => (networkCash[i] += c));
    r.paidCum.forEach((c, i) => (networkPaid[i] += c));
    for (const t of r.topUps) topUps.push({ shopId: shop.id, ...t });

    const demand = sum(p.demand);
    demandAll += demand;
    paidAll += sum(r.paid);
    cashAll += sum(r.cash) / steps;
    flatPaid += sum(flat.paid);
    flatCash += sum(flat.cash) / steps;
    shopDaysRedirected += r.redirected.filter((x) => x > 0.5).length;

    shops.push({
      id: shop.id,
      cash: r.cash.map(r2),
      ceiling: r.ceiling.map(r2),
      paidCum: r.paidCum.map(r2),
      days: shop.days.map((d, i) => ({
        day: d.day,
        ceilingCad: ceilCad[i],
        ceilingUsd: r2(ceilUsd[i]),
        demandUsd: r2(p.demand[i]),
        paidUsd: r2(r.paid[i]),
        redirectedUsd: r2(r.redirected[i]),
      })),
      avgCashUsd: r2(sum(r.cash) / steps),
      servedPct: demand > 0 ? (100 * sum(r.paid)) / demand : 100,
    });
  }

  return {
    steps,
    shops,
    topUps: topUps.sort((a, b) => a.startStep - b.startStep),
    networkCash: networkCash.map(r2),
    networkPaid: networkPaid.map(r2),
    totals: {
      demandUsd: r2(demandAll),
      paidUsd: r2(paidAll),
      redirectedUsd: r2(demandAll - paidAll),
      servedPct: demandAll > 0 ? (100 * paidAll) / demandAll : 100,
      avgCashUsd: r2(cashAll),
      topUps: topUps.length,
      shopDaysRedirected,
    },
    flat: {
      avgCashUsd: r2(flatCash),
      servedPct: demandAll > 0 ? (100 * flatPaid) / demandAll : 100,
      redirectedUsd: r2(demandAll - flatPaid),
    },
  };
}
