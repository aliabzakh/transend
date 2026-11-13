import { ok, route } from "@/lib/server/http";
import { requireShop } from "@/lib/server/session";
import { activationState } from "@/lib/server/shops";

/** Polled by the shop while it waits for the sender's "Yes, that's her". */
export const GET = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const shop = await requireShop();
  const { id } = await params;
  return ok(await activationState(shop, id));
});
