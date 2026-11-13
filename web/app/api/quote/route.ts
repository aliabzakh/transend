import { HttpError, ok, route } from "@/lib/server/http";
import { requireSender } from "@/lib/server/session";
import { createQuote } from "@/lib/server/transfers";

/** GET /api/quote?amount_cad=200&card_id=TS4F2K9Q: firm for 30 seconds; refuses under C$100. */
export const GET = route(async (req) => {
  const user = await requireSender();
  const p = new URL(req.url).searchParams;
  const amount = Number(p.get("amount_cad"));
  const cardId = p.get("card_id");
  if (!cardId) throw new HttpError(400, "bad_input");
  return ok(await createQuote(user, cardId, amount));
});
