import { ok, route } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/session";
import { recomputeAll } from "@/lib/server/forecast";

export const maxDuration = 60;

/** The dashboard's "Recompute" button: the same job the nightly cron runs. */
export const POST = route(async (req) => {
  requireAdmin(req);
  const all = await recomputeAll();
  return ok({ shops: all.map((f) => ({ id: f.shop.id, ceilingCad: f.suggestedCeilingCad, forecaster: f.forecaster })) });
});
