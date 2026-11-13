import { fail, ok, route } from "@/lib/server/http";
import { recomputeAll } from "@/lib/server/forecast";

export const maxDuration = 60;

/** Nightly job (Vercel cron, see vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`. */
export const GET = route(async (req) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return fail(401, "unauthorized");
  const all = await recomputeAll();
  return ok({ recomputed: all.length });
});
