import { ok, route } from "@/lib/server/http";
import { requireSender } from "@/lib/server/session";
import { inbox } from "@/lib/server/views";

/** Simulated SMS inbox and activity, newest first. */
export const GET = route(async () => {
  const user = await requireSender();
  return ok({ inbox: await inbox(user) });
});
