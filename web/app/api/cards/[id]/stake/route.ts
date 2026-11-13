import { body, ok, route } from "@/lib/server/http";
import { requireSender } from "@/lib/server/session";
import { stakeFor } from "@/lib/server/savings";

export const maxDuration = 60;

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireSender();
  const { id } = await params;
  const { amountUsd } = await body<{ amountUsd: number }>(req);
  return ok(await stakeFor(user, id, amountUsd));
});
