import { body, ok, route } from "@/lib/server/http";
import { requireSender } from "@/lib/server/session";
import { verifyIdentity } from "@/lib/server/senders";

/** Mocked KYC. The ID photo is never uploaded: the form keeps it in the browser. */
export const POST = route(async (req) => {
  const user = await requireSender();
  const { name } = await body<{ name: string }>(req);
  await verifyIdentity(user, name);
  return ok({ verified: true });
});
