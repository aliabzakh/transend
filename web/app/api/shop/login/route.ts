import { body, ok, route } from "@/lib/server/http";
import { clientIp, rateLimit } from "@/lib/server/ratelimit";
import { getSession } from "@/lib/server/session";
import { shopLogIn } from "@/lib/server/shops";

export const POST = route(async (req) => {
  await rateLimit(`auth:${clientIp(req)}`, 20, 600);
  const { code, password } = await body<{ code: string; password: string }>(req);
  const shop = await shopLogIn(code, password);
  const s = await getSession();
  s.shopId = shop.id;
  await s.save();
  return ok({ shopId: shop.id });
});
