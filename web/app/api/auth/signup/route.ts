import { body, ok, route } from "@/lib/server/http";
import { clientIp, rateLimit } from "@/lib/server/ratelimit";
import { getSession } from "@/lib/server/session";
import { signUp } from "@/lib/server/senders";

export const maxDuration = 60;

export const POST = route(async (req) => {
  await rateLimit(`auth:${clientIp(req)}`, 20, 600);
  const { email, password } = await body<{ email: string; password: string }>(req);
  const user = await signUp(email, password);
  const s = await getSession();
  s.senderId = user.id;
  await s.save();
  return ok({ verified: false });
});
