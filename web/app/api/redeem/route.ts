import { body, ok, route } from "@/lib/server/http";
import { clientIp, rateLimit } from "@/lib/server/ratelimit";
import { requireShop } from "@/lib/server/session";
import { redeemForShop, type RedeemInput } from "@/lib/server/verify";

export const maxDuration = 60;

export const POST = route(async (req) => {
  const shop = await requireShop();
  const input = await body<RedeemInput>(req);
  await rateLimit(`redeem:ip:${clientIp(req)}`, 30, 60);
  await rateLimit(`redeem:card:${String(input.cardId).toUpperCase()}`, 10, 60);
  return ok(await redeemForShop(shop, input));
});
