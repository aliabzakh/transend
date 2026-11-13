/**
 * Synthetic daily payouts per shop, labelled "Sample data" everywhere they show.
 * The MVP has no real withdrawal history: this is what the forecast is trained and
 * tested on. Deterministic for a given shop and date, so runs are repeatable.
 *
 * Patterns built in: day of week (Saturday market, quiet Sunday), the start of the
 * month and the payout spike a few days after monthly top-ups, September school
 * fees, year-end, and quieter days while the area is "tense".
 */
export type SampleDay = { day: string; paidUsd: number; areaStatus: "calm" | "tense" | "closed" };

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const hashStr = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

export const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Calendar effects shared by the generator, the baseline and the model features. */
export function calendar(d: Date) {
  const dow = d.getUTCDay();
  const dom = d.getUTCDate();
  const month = d.getUTCMonth() + 1;
  return {
    dow,
    dom,
    month,
    monthStart: dom <= 3 ? 1 : 0,
    afterTopup: dom >= 4 && dom <= 7 ? 1 : 0,
    schoolFees: month === 9 && dom <= 20 ? 1 : 0,
    yearEnd: month === 12 && dom >= 15 ? 1 : 0,
  };
}

const DOW = [0.6, 1.0, 0.95, 1.0, 1.05, 1.2, 1.55]; // Sun..Sat

/** `days` of history ending the day before `end` (UTC). */
export function sampleHistory(shopId: string, end: Date, days = 60): SampleDay[] {
  const rand = mulberry32(hashStr(`sample:${shopId}`));
  const base = 35 + rand() * 45;
  const out: SampleDay[] = [];
  let tenseLeft = 0;
  for (let i = days; i >= 1; i--) {
    const d = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() - i));
    const c = calendar(d);
    // Day-seeded randomness so a given date always gets the same value.
    const r = mulberry32(hashStr(`${shopId}:${isoDay(d)}`));
    if (tenseLeft === 0 && r() < 0.04) tenseLeft = 2 + Math.floor(r() * 3);
    const tense = tenseLeft > 0;
    if (tenseLeft > 0) tenseLeft--;
    let v = base * DOW[c.dow];
    if (c.monthStart) v *= 1.45;
    if (c.afterTopup) v *= 1.25;
    if (c.schoolFees) v *= 1.4;
    if (c.yearEnd) v *= 1.35;
    if (tense) v *= 0.55;
    v *= 0.8 + r() * 0.4;
    out.push({ day: isoDay(d), paidUsd: Math.round(v * 100) / 100, areaStatus: tense ? "tense" : "calm" });
  }
  return out;
}
