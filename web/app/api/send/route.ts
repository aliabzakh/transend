import { body, ok, route } from "@/lib/server/http";
import { requireSender } from "@/lib/server/session";
import { sendQuote } from "@/lib/server/transfers";

export const maxDuration = 60;

export const POST = route(async (req) => {
  const user = await requireSender();
  const { quoteId } = await body<{ quoteId: string }>(req);
  return ok(await sendQuote(user, quoteId));
});
