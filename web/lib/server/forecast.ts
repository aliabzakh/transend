/**
 * Feeds the forecast with data and stores its results. Inputs are numbers only:
 * daily payouts (synthetic sample data plus real redeems), liquid money waiting on
 * nearby cards, how many senders are due to top up, the calendar and the area status.
 * No names, relationships or demographic features.
 */
import { and, asc, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { CONFIG } from "../config";
import modelJson from "../risk/model.json";
import { forecastShop, waitingBalanceUsd, type DayPoint, type ShopForecast } from "../risk/forecast";
import { isForecastModel, type ForecastModel } from "../risk/model";
import { isoDay } from "../risk/sample";
import * as escrow from "../stellar/escrow";
import { env } from "./env";

type Shop = typeof schema.shops.$inferSelect;

const MODEL: ForecastModel | null = isForecastModel(modelJson) ? (modelJson as ForecastModel) : null;
export const modelMetrics = () => MODEL?.metrics ?? null;

const todayUtc = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

/** 60 days of daily payouts ending yesterday: sample data plus any real redeems on top. */
export async function historyFor(shopId: string, days = 60): Promise<DayPoint[]> {
  const today = todayUtc();
  const since = new Date(today.getTime() - days * 86_400_000);
  const sample = await db
    .select()
    .from(schema.samplePayouts)
    .where(and(eq(schema.samplePayouts.shopId, shopId), gte(schema.samplePayouts.day, isoDay(since))))
    .orderBy(asc(schema.samplePayouts.day));
  const real = await db
    .select({
      day: sql<string>`to_char(${schema.transfers.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`,
      total: sql<number>`sum(${schema.transfers.amountUsd})`,
    })
    .from(schema.transfers)
    .where(and(eq(schema.transfers.shopId, shopId), eq(schema.transfers.kind, "redeem"), gte(schema.transfers.createdAt, since)))
    .groupBy(sql`1`);
  const byDay = new Map<string, DayPoint>();
  for (const s of sample) byDay.set(s.day, { day: s.day, paidUsd: s.paidUsd, tense: s.areaStatus === "tense" });
  for (const r of real) {
    if (r.day >= isoDay(today)) continue; // today is not over yet
    const p = byDay.get(r.day) ?? { day: r.day, paidUsd: 0 };
    byDay.set(r.day, { ...p, paidUsd: p.paidUsd + Number(r.total) });
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

/** Liquid money waiting on active cards whose recipient lives in the shop's commune. */
async function waitingNear(shop: Shop, communeName: string): Promise<number> {
  const rows = await db
    .select({ id: schema.cards.id })
    .from(schema.cards)
    .innerJoin(schema.recipients, eq(schema.cards.recipientId, schema.recipients.id))
    .where(and(eq(schema.cards.status, "Active"), sql`lower(${schema.recipients.commune}) = lower(${communeName})`));
  const cards = await Promise.all(rows.map((r) => escrow.getCard(r.id).catch(() => null)));
  return waitingBalanceUsd(cards.filter((c) => c !== null).map((c) => ({ balanceUsd: c!.balanceUsd, stakedUsd: c!.stakedUsd })));
}

/** Senders who topped up 28 to 35 days ago: on a monthly cadence they are due this week. */
async function sendersDue(): Promise<number> {
  const now = Date.now();
  const [r] = await db
    .select({ n: sql<number>`count(distinct ${schema.transfers.senderId})` })
    .from(schema.transfers)
    .where(
      and(
        eq(schema.transfers.kind, "deposit"),
        gte(schema.transfers.createdAt, new Date(now - 35 * 86_400_000)),
        sql`${schema.transfers.createdAt} < ${new Date(now - 28 * 86_400_000).toISOString()}`,
      ),
    );
  return Number(r?.n ?? 0);
}

export type ShopForecastView = ShopForecast & {
  shop: { id: string; name: string; ceilingCad: number; hardCapCad: number };
  area: { name: string; status: string };
  last7Usd: number;
  history: DayPoint[];
};

export async function forecastFor(shop: Shop): Promise<ShopForecastView> {
  const area = await db.query.communes.findFirst({ where: eq(schema.communes.id, shop.communeId) });
  const history = await historyFor(shop.id);
  const f = forecastShop({
    shopId: shop.id,
    history,
    today: todayUtc(),
    waitingUsd: await waitingNear(shop, area?.name ?? ""),
    tense: area?.status === "tense",
    toppingUpSenders: await sendersDue(),
    floorCad: CONFIG.ceilingFloorCad,
    hardCapCad: shop.hardCapCad,
    cadToUsd: CONFIG.demoRateCadUsd,
    mode: env.forecastMode,
    model: MODEL,
  });
  return {
    ...f,
    shop: { id: shop.id, name: shop.name, ceilingCad: shop.ceilingCad, hardCapCad: shop.hardCapCad },
    area: { name: area?.name ?? "", status: area?.status ?? "calm" },
    last7Usd: Math.round(history.slice(-7).reduce((a, p) => a + p.paidUsd, 0) * 100) / 100,
    history,
  };
}

/** Nightly (and on demand): recompute every shop, store the band and set the ceiling. */
export async function recomputeAll(): Promise<ShopForecastView[]> {
  const shops = await db.select().from(schema.shops).orderBy(asc(schema.shops.id));
  const out: ShopForecastView[] = [];
  for (const shop of shops) {
    const f = await forecastFor(shop);
    await db.insert(schema.forecasts).values(
      f.days.map((d) => ({
        shopId: shop.id,
        day: d.day,
        p10: d.p10,
        p50: d.p50,
        p90: d.p90,
        ceilingCad: f.suggestedCeilingCad,
        modelVersion: f.modelVersion,
      })),
    );
    // The forecast only moves the ceiling between the floor and the admin's hard cap.
    await db.update(schema.shops).set({ ceilingCad: f.suggestedCeilingCad }).where(eq(schema.shops.id, shop.id));
    out.push({ ...f, shop: { ...f.shop, ceilingCad: f.suggestedCeilingCad } });
  }
  return out;
}
