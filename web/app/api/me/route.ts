import { ok, route } from "@/lib/server/http";
import { requireSender } from "@/lib/server/session";
import { senderView } from "@/lib/server/views";

/** Everything the sender home, card and send screens need, in one call. */
export const GET = route(async () => {
  const user = await requireSender();
  return ok({ me: await senderView(user) });
});
