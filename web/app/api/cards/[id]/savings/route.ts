import { ok, route } from "@/lib/server/http";
import { requireSender } from "@/lib/server/session";
import { savingsView } from "@/lib/server/savings";

/** Available now, set aside, earned and the demo rate for one of the sender's cards. */
export const GET = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireSender();
  const { id } = await params;
  return ok(await savingsView(user, id));
});
