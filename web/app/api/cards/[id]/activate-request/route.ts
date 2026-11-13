import { ok, route } from "@/lib/server/http";
import { requireShop } from "@/lib/server/session";
import { requestActivation } from "@/lib/server/shops";

export const POST = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const shop = await requireShop();
  const { id } = await params;
  return ok(await requestActivation(shop, id));
});
