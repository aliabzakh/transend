import { sql } from "drizzle-orm";
import { db } from "@/db";
import { HttpError } from "./http";

/**
 * Fixed-window limit shared by every server instance (stored in Postgres).
 * Throws 429 `too_many_requests` once `max` calls in `windowSec` are used.
 */
export async function rateLimit(key: string, max: number, windowSec: number): Promise<void> {
  const windowStart = new Date(Math.floor(Date.now() / (windowSec * 1000)) * windowSec * 1000);
  const rows = await db.execute<{ count: number }>(sql`
    insert into rate_limits (key, window_start, count) values (${key}, ${windowStart.toISOString()}, 1)
    on conflict (key, window_start) do update set count = rate_limits.count + 1
    returning count`);
  if (Number(rows[0]?.count ?? 0) > max) throw new HttpError(429, "too_many_requests");
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}
