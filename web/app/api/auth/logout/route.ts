import { ok, route } from "@/lib/server/http";
import { getSession } from "@/lib/server/session";

/** Signs out the sender, the shop, or both (`?who=sender|shop`). */
export const POST = route(async (req) => {
  const who = new URL(req.url).searchParams.get("who");
  const s = await getSession();
  if (who !== "shop") delete s.senderId;
  if (who !== "sender") delete s.shopId;
  await s.save();
  return ok({});
});
