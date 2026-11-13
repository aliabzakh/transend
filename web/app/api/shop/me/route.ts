import { ok, route } from "@/lib/server/http";
import { requireShop } from "@/lib/server/session";
import { shopView } from "@/lib/server/shops";

export const GET = route(async () => {
  const shop = await requireShop();
  return ok(await shopView(shop));
});
