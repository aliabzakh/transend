import { eq } from "drizzle-orm";
import { HttpError, ok, route } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/session";
import { forecastFor, modelMetrics } from "@/lib/server/forecast";
import { db, schema } from "@/db";

export const maxDuration = 60;

/** Forecast band, ceiling, restock windows, reason line, and which forecaster is live. */
export const GET = route<{ params: Promise<{ shopId: string }> }>(async (req, { params }) => {
  requireAdmin(req);
  const { shopId } = await params;
  const shop = await db.query.shops.findFirst({ where: eq(schema.shops.id, shopId) });
  if (!shop) throw new HttpError(404, "not_found");
  const { history: _h, ...f } = await forecastFor(shop);
  return ok({ forecast: f, model: modelMetrics(), sampleData: true });
});
