import { body, ok, route } from "@/lib/server/http";
import { clientIp, rateLimit } from "@/lib/server/ratelimit";
import { requireShop } from "@/lib/server/session";
import { balanceForShop } from "@/lib/server/verify";

export const maxDuration = 60;

/** Card ID + PIN: the amount she can collect now. Never the amount set aside. */
export const POST = route(async (req) => {
  await requireShop();
  const { cardId, pin } = await body<{ cardId: string; pin: string }>(req);
  await rateLimit(`balance:ip:${clientIp(req)}`, 30, 60);
  await rateLimit(`balance:card:${String(cardId).toUpperCase()}`, 10, 60);
  return ok(await balanceForShop(cardId, pin));
});
