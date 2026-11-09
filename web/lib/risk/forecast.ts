/**
 * Cash-distribution rules for each shop. No machine learning in the MVP: a 7-day
 * moving average of payouts, lifted on known peaks, plus restock times that change
 * from day to day. Pure functions so stage 2 can feed them real withdrawal data.
 */
export type DayPoint = { date: string; paidUsd: number };

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hashStr = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** 60 days of seeded sample withdrawals for one shop, ending today. */
export function sampleHistory(shopId: string, today: Date, days = 60): DayPoint[] {
  const rand = mulberry32(hashStr(shopId));
  const base = 40 + rand() * 50;
  const out: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const dow = d.getUTCDay();
    const weekly = dow === 6 ? 1.5 : dow === 0 ? 0.6 : 1;
    const monthStart = d.getUTCDate() <= 3 ? 1.6 : 1;
    out.push({ date: iso(d), paidUsd: Math.round(base * weekly * monthStart * (0.7 + rand() * 0.6)) });
  }
  return out;
}

export function movingAverage(points: DayPoint[], n = 7): number {
  const last = points.slice(-n);
  return last.reduce((s, p) => s + p.paidUsd, 0) / Math.max(1, last.length);
}

/** Known demand peaks: start of month, September school fees, year-end. */
export function peakFactor(d: Date): { factor: number; reason: string | null } {
  const month = d.getUTCMonth();
  const day = d.getUTCDate();
  if (month === 8 && day <= 20) return { factor: 1.5, reason: "September school fees" };
  if (month === 11 && day >= 15) return { factor: 1.4, reason: "Year-end" };
  if (day <= 3) return { factor: 1.3, reason: "Start of month" };
  return { factor: 1, reason: null };
}

export type ShopForecast = {
  tomorrowUsd: number;
  reason: string | null;
  suggestedCeilingUsd: number;
  restockTimes: string[];
};

/** Restock at two times that differ from day to day, so nobody can predict a delivery. */
export function restockTimes(shopId: string, date: string): string[] {
  const rand = mulberry32(hashStr(`${shopId}:${date}`));
  const pick = (from: number, to: number) => {
    const minutes = Math.floor(from + rand() * (to - from));
    const rounded = Math.round(minutes / 5) * 5;
    return `${String(Math.floor(rounded / 60)).padStart(2, "0")}:${String(rounded % 60).padStart(2, "0")}`;
  };
  return [pick(7 * 60 + 30, 11 * 60), pick(13 * 60, 17 * 60 + 30)];
}

export function forecastTomorrow(
  shopId: string,
  history: DayPoint[],
  today: Date,
  waitingBalancesUsd: number,
): ShopForecast {
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const { factor, reason } = peakFactor(tomorrow);
  const base = movingAverage(history) * factor;
  const tomorrowUsd = Math.round(Math.max(base, waitingBalancesUsd * 0.1));
  // Hold roughly 1.5x the expected payouts, never below US$150 or above US$450.
  const suggestedCeilingUsd = Math.round(Math.min(450, Math.max(150, tomorrowUsd * 1.5)));
  return { tomorrowUsd, reason, suggestedCeilingUsd, restockTimes: restockTimes(shopId, iso(tomorrow)) };
}
