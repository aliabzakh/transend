import { body, HttpError, ok, route } from "@/lib/server/http";
import { getSession, requireAdmin } from "@/lib/server/session";
import { setAreaStatus, type AreaStatus } from "@/lib/server/shops";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

/** A shop sets its own area with one tap; admin (Basic auth) can set any area. */
export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  const { status } = await body<{ status: AreaStatus }>(req);
  const s = await getSession();
  const shop = s.shopId ? await db.query.shops.findFirst({ where: eq(schema.shops.id, s.shopId) }) : undefined;
  if (!shop || shop.communeId !== id) {
    try {
      requireAdmin(req);
    } catch {
      throw new HttpError(403, "not_your_area");
    }
  }
  const row = await setAreaStatus(id, status);
  return ok({ area: { id: row.id, status: row.status } });
});
