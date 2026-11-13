import { asc } from "drizzle-orm";
import { body, ok, route } from "@/lib/server/http";
import { setAreaStatus, type AreaStatus } from "@/lib/server/shops";
import { requireAdmin } from "@/lib/server/session";
import { db, schema } from "@/db";

/** Areas with their risk level, and shops with their cash ceiling and hard cap. */
export const GET = route(async (req) => {
  requireAdmin(req);
  const communes = await db.select().from(schema.communes).orderBy(asc(schema.communes.name));
  const shops = await db
    .select({
      id: schema.shops.id,
      name: schema.shops.name,
      communeId: schema.shops.communeId,
      ceilingCad: schema.shops.ceilingCad,
      hardCapCad: schema.shops.hardCapCad,
    })
    .from(schema.shops)
    .orderBy(asc(schema.shops.id));
  return ok({
    communes: communes.map((c) => ({ id: c.id, name: c.name, department: c.department, status: c.status })),
    shops,
  });
});

/** Admin override of an area's risk level: { communeId, status }. */
export const POST = route(async (req) => {
  requireAdmin(req);
  const { communeId, status } = await body<{ communeId: string; status: AreaStatus }>(req);
  const row = await setAreaStatus(communeId, status);
  return ok({ area: { id: row.id, status: row.status } });
});
