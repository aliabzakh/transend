import { eq } from "drizzle-orm";
import { body, HttpError, ok, route } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/session";
import { db, schema } from "@/db";
import { CONFIG } from "@/lib/config";

/** Admin sets a shop's cash ceiling and its hard cap (C$). The ceiling never exceeds the cap. */
export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  requireAdmin(req);
  const { id } = await params;
  const { ceilingCad, hardCapCad } = await body<{ ceilingCad?: number; hardCapCad?: number }>(req);
  const shop = await db.query.shops.findFirst({ where: eq(schema.shops.id, id) });
  if (!shop) throw new HttpError(404, "not_found");
  const cap = hardCapCad === undefined ? shop.hardCapCad : Math.round(Number(hardCapCad));
  const ceiling = ceilingCad === undefined ? shop.ceilingCad : Math.round(Number(ceilingCad));
  if (!(cap >= CONFIG.ceilingFloorCad) || !(ceiling >= CONFIG.ceilingFloorCad) || ceiling > cap) {
    throw new HttpError(400, "bad_ceiling", { floorCad: CONFIG.ceilingFloorCad });
  }
  await db.update(schema.shops).set({ ceilingCad: ceiling, hardCapCad: cap }).where(eq(schema.shops.id, id));
  return ok({ shop: { id, ceilingCad: ceiling, hardCapCad: cap } });
});
