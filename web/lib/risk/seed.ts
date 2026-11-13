import { db, schema } from "@/db";
import { sampleHistory } from "./sample";

/** Writes 60 days of synthetic payouts for every shop (upsert, so re-running is safe). */
export async function seedSamplePayouts(end = new Date(), days = 60) {
  const shops = await db.select({ id: schema.shops.id }).from(schema.shops);
  for (const s of shops) {
    const rows = sampleHistory(s.id, end, days).map((d) => ({ shopId: s.id, ...d }));
    for (const r of rows) {
      await db
        .insert(schema.samplePayouts)
        .values(r)
        .onConflictDoUpdate({
          target: [schema.samplePayouts.shopId, schema.samplePayouts.day],
          set: { paidUsd: r.paidUsd, areaStatus: r.areaStatus },
        });
    }
  }
  return shops.length;
}
