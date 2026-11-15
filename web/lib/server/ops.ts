/**
 * Data for the public operations view (/ops): every shop's forecast band, ceiling,
 * restock windows and a 14-day backtest. The three real demo shops
 * come from the database through the same forecast service as /admin/cash; the
 * simulated network runs the same forecastShop on synthetic payouts.
 * Nothing here changes a ceiling: it only reads.
 */
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { CONFIG } from "../config";
import modelJson from "../risk/model.json";
import { forecastShop, restockWindows, type DayPoint, type ForecastDay, type RestockDay } from "../risk/forecast";
import { isForecastModel, type ForecastModel } from "../risk/model";
import { SIM_COMMUNES, SIM_SHOPS, type AreaStatus } from "../risk/network";
import { isoDay, sampleHistory, sampleWaitingUsd } from "../risk/sample";
import { COMMUNES as DEMO_COMMUNES, SHOPS as DEMO_SHOPS } from "./demo";
import { env } from "./env";
import { forecastFor } from "./forecast";

const MODEL: ForecastModel | null = isForecastModel(modelJson) ? (modelJson as ForecastModel) : null;
const HORIZON = 7;
const BACKTEST_DAYS = 14;

export type BacktestDay = { day: string; p10: number; p50: number; p90: number; actual: number };

export type OpsShop = {
  id: string;
  name: string;
  simulated: boolean;
  lat: number;
  lng: number;
  commune: string;
  department: string;
  status: AreaStatus;
  hardCapCad: number;
  ceilingCadNow: number;
  suggestedCeilingCad: number;
  reason: string;
  forecaster: string;
  modelVersion: string;
  days: ForecastDay[];
  /** Restock windows for the same dates as `days` (today first). */
  restock: RestockDay[];
  history: DayPoint[];
  backtest: BacktestDay[];
  last7Usd: number;
};

export type OpsData = {
  today: string;
  generatedAt: string;
  cadToUsd: number;
  floorCad: number;
  realSource: "database" | "fallback";
  model: {
    version: string;
    trainedOn: string;
    live: boolean;
    baselineMae: number;
    modelMae: number;
    improvementPct: number;
    holdoutDays: number;
    coverage: number | null;
    bandScale: number;
  } | null;
  shops: OpsShop[];
};

const todayUtc = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
const r2 = (n: number) => Math.round(n * 100) / 100;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
}

const baseInput = (shopId: string, hardCapCad: number) => ({
  shopId,
  floorCad: CONFIG.ceilingFloorCad,
  hardCapCad,
  cadToUsd: CONFIG.demoRateCadUsd,
  mode: env.forecastMode,
  model: MODEL,
});

/** One-day-ahead forecasts for the last 14 days of history, each made only from the days before it. */
function backtest(shopId: string, history: DayPoint[], hardCapCad: number): BacktestDay[] {
  const out: BacktestDay[] = [];
  for (let i = Math.max(7, history.length - BACKTEST_DAYS); i < history.length; i++) {
    const past = history.slice(0, i);
    const f = forecastShop({
      ...baseInput(shopId, hardCapCad),
      history: past,
      today: new Date(`${history[i].day}T00:00:00Z`),
      // Waiting money on that day is not stored, so the backtest uses the sample estimate for every shop.
      waitingUsd: sampleWaitingUsd(shopId, history[i].day, past.map((p) => p.paidUsd)),
      tense: !!history[i].tense,
      horizonDays: 1,
    });
    out.push({ ...f.days[0], actual: history[i].paidUsd });
  }
  return out;
}

/** Restock windows for today and the six days after, aligned with the forecast days. */
const alignedRestock = (shopId: string, today: Date) => restockWindows(shopId, addDays(today, -1), HORIZON);

function sampleShop(
  s: { id: string; name: string; lat: number; lng: number; hardCapCad: number; ceilingCadNow?: number },
  area: { name: string; department: string; status: AreaStatus },
  simulated: boolean,
  today: Date,
): OpsShop {
  const history: DayPoint[] = sampleHistory(s.id, today, 60).map((d) => ({
    day: d.day,
    paidUsd: d.paidUsd,
    tense: d.areaStatus === "tense",
  }));
  const f = forecastShop({
    ...baseInput(s.id, s.hardCapCad),
    history,
    today,
    waitingUsd: sampleWaitingUsd(s.id, isoDay(today), history.map((p) => p.paidUsd)),
    tense: area.status === "tense",
  });
  return {
    id: s.id,
    name: s.name,
    simulated,
    lat: s.lat,
    lng: s.lng,
    commune: area.name,
    department: area.department,
    status: area.status,
    hardCapCad: s.hardCapCad,
    ceilingCadNow: s.ceilingCadNow ?? f.suggestedCeilingCad,
    suggestedCeilingCad: f.suggestedCeilingCad,
    reason: f.reason,
    forecaster: f.forecaster,
    modelVersion: f.modelVersion,
    days: f.days,
    restock: alignedRestock(s.id, today),
    history: history.slice(-28),
    backtest: backtest(s.id, history, s.hardCapCad),
    last7Usd: r2(history.slice(-7).reduce((a, p) => a + p.paidUsd, 0)),
  };
}

async function realShops(today: Date): Promise<{ shops: OpsShop[]; source: OpsData["realSource"] }> {
  try {
    const [shops, communes] = await withTimeout(
      Promise.all([db.select().from(schema.shops).orderBy(asc(schema.shops.id)), db.select().from(schema.communes)]),
      5000,
    );
    const views = await withTimeout(Promise.all(shops.map((s) => forecastFor(s))), 12000);
    return {
      source: "database",
      shops: views.map((f, i) => {
        const s = shops[i];
        const c = communes.find((x) => x.id === s.communeId);
        const demo = DEMO_SHOPS.find((x) => x.id === s.id);
        return {
          id: s.id,
          name: s.name,
          simulated: false,
          lat: s.lat ?? demo?.lat ?? c?.lat ?? 19.8,
          lng: s.lng ?? demo?.lng ?? c?.lng ?? -73,
          commune: c?.name ?? f.area.name,
          department: c?.department ?? "",
          status: (c?.status ?? "calm") as AreaStatus,
          hardCapCad: s.hardCapCad,
          ceilingCadNow: s.ceilingCad,
          suggestedCeilingCad: f.suggestedCeilingCad,
          reason: f.reason,
          forecaster: f.forecaster,
          modelVersion: f.modelVersion,
          days: f.days,
          restock: alignedRestock(s.id, today),
          history: f.history.slice(-28),
          backtest: backtest(s.id, f.history, s.hardCapCad),
          last7Usd: f.last7Usd,
        };
      }),
    };
  } catch {
    // No database (or it is slow): the same three shops on their sample data, so the view still works.
    return {
      source: "fallback",
      shops: DEMO_SHOPS.map((s) => {
        const c = DEMO_COMMUNES.find((x) => x.id === s.communeId)!;
        return sampleShop(
          { ...s, hardCapCad: 1000 },
          { name: c.name, department: c.department, status: "calm" },
          false,
          today,
        );
      }),
    };
  }
}

export async function opsData(): Promise<OpsData> {
  const today = todayUtc();
  const real = await realShops(today);
  const simulated = SIM_SHOPS.map((s) => {
    const c = SIM_COMMUNES.find((x) => x.id === s.communeId)!;
    return sampleShop(s, { name: c.name, department: c.department, status: c.status }, true, today);
  });
  const m = MODEL;
  return {
    today: isoDay(today),
    generatedAt: new Date().toISOString(),
    cadToUsd: CONFIG.demoRateCadUsd,
    floorCad: CONFIG.ceilingFloorCad,
    realSource: real.source,
    model: m
      ? {
          version: m.version,
          trainedOn: m.trainedOn,
          live: real.shops.concat(simulated).some((s) => s.forecaster === "model"),
          baselineMae: m.metrics.baselineMae,
          modelMae: m.metrics.modelMae,
          improvementPct: m.metrics.improvementPct,
          holdoutDays: m.metrics.holdoutDays,
          coverage: m.metrics.p10p90Coverage ?? null,
          bandScale: m.calibration?.bandScale ?? 1,
        }
      : null,
    shops: [...real.shops, ...simulated],
  };
}
