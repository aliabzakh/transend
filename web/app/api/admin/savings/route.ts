import { body, ok, route } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/session";
import { adminSavings } from "@/lib/server/savings";
import { getSavings } from "@/lib/stellar/escrow";

export const maxDuration = 60;

export const GET = route(async (req) => {
  requireAdmin(req);
  return ok({ savings: await getSavings() });
});

/** { action: "set_apy" | "fund" | "pause" | "unpause" | "speedup", value } */
export const POST = route(async (req) => {
  requireAdmin(req);
  const { action, value } = await body<{ action: string; value?: number }>(req);
  const res = await adminSavings(action, value);
  return ok({ txHash: res.hash, savings: await getSavings() });
});
