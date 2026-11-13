import { body, ok, route } from "@/lib/server/http";
import { requireShop } from "@/lib/server/session";
import { replyFromRecipient } from "@/lib/server/verify";

/** A preset reply from the recipient to the sender, sent from the shop's phone. */
export const POST = route(async (req) => {
  const shop = await requireShop();
  const { cardId, choice } = await body<{ cardId: string; choice: number }>(req);
  return ok(await replyFromRecipient(shop, cardId, Number(choice)));
});
