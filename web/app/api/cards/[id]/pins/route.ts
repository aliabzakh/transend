import { body, ok, route } from "@/lib/server/http";
import { clientIp, rateLimit } from "@/lib/server/ratelimit";
import { requireShop } from "@/lib/server/session";
import { setPin } from "@/lib/server/shops";

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const shop = await requireShop();
  const { id } = await params;
  await rateLimit(`pins:${clientIp(req)}`, 20, 600);
  const { pin } = await body<{ pin: string }>(req);
  return ok(await setPin(shop, id, pin));
});
