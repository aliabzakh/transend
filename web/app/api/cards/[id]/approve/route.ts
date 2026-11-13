import { ok, route } from "@/lib/server/http";
import { requireSender } from "@/lib/server/session";
import { approveActivation } from "@/lib/server/cards";

export const maxDuration = 60;

export const POST = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireSender();
  const { id } = await params;
  return ok(await approveActivation(user, id));
});
