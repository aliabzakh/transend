/**
 * Writes the forecast training table from the synthetic sample data:
 * scripts/ml/data/sample_payouts.csv. Features and the rules baseline come from
 * web/lib/risk/features.ts, the same code that scores live forecasts.
 * Shops: the three real demo shops plus the simulated network (web/lib/risk/network.ts).
 * The last 14 days of each shop are held out for testing, and the 28 days before
 * them are the calibration window for the p10-p90 band.
 *
 * Usage: npm run ml:export   (then: npm run ml:train)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FEATURES, baselineP50, featuresFor } from "../../web/lib/risk/features.ts";
import { TRAINING_SHOP_IDS } from "../../web/lib/risk/network.ts";
import { sampleHistory, sampleWaitingUsd } from "../../web/lib/risk/sample.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SHOPS = TRAINING_SHOP_IDS;
const DAYS = 240; // synthetic history for training; the dashboard shows the last 60
const HOLDOUT = 14;
const CALIB = 28;
// A fixed end date keeps the committed model reproducible.
const END = new Date(process.argv[2] ? `${process.argv[2]}T00:00:00Z` : "2026-11-13T00:00:00Z");

const rows: string[] = [["shop", "day", "holdout", "calib", ...FEATURES, "baseline_p50", "y"].join(",")];
for (const shop of SHOPS) {
  const h = sampleHistory(shop, END, DAYS);
  for (let i = 7; i < h.length; i++) {
    const day = new Date(`${h[i].day}T00:00:00Z`);
    const past = h.slice(0, i).map((p) => p.paidUsd);
    const tense = h[i].areaStatus === "tense";
    const waiting = sampleWaitingUsd(shop, h[i].day, past);
    const x = featuresFor(day, past, waiting, tense);
    rows.push(
      [shop, h[i].day, i >= h.length - HOLDOUT ? 1 : 0, i >= h.length - HOLDOUT - CALIB && i < h.length - HOLDOUT ? 1 : 0, ...x.map((v) => +v.toFixed(4)), baselineP50(day, past, tense).toFixed(4), h[i].paidUsd].join(","),
    );
  }
}
mkdirSync(resolve(HERE, "data"), { recursive: true });
writeFileSync(resolve(HERE, "data/sample_payouts.csv"), rows.join("\n") + "\n");
console.log(`Wrote ${rows.length - 1} rows (synthetic sample data) to scripts/ml/data/sample_payouts.csv`);
