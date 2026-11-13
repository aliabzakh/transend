import { body, ok, route } from "@/lib/server/http";
import { requireSender } from "@/lib/server/session";
import { addRecipient } from "@/lib/server/cards";

export const POST = route(async (req) => {
  const user = await requireSender();
  const input = await body<{ name: string; relationship: string; commune: string; department: string }>(req);
  const r = await addRecipient(user, input);
  return ok({ recipientId: r.id });
});
