import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { env } from "./env";
import { HttpError } from "./http";

/**
 * One cookie holds the sender's and the shop's identity separately, so the demo can
 * run both apps in one browser. It never holds a PIN, a code or a key.
 */
export type SessionData = { senderId?: string; shopId?: string };

const options = (): SessionOptions => ({
  cookieName: "transend_session",
  password: env.sessionSecret,
  cookieOptions: { secure: process.env.NODE_ENV === "production", httpOnly: true, sameSite: "lax" },
});

export const getSession = async () => getIronSession<SessionData>(await cookies(), options());

export async function requireSender() {
  const s = await getSession();
  if (!s.senderId) throw new HttpError(401, "not_signed_in");
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, s.senderId) });
  if (!user) throw new HttpError(401, "not_signed_in");
  return user;
}

export async function requireShop() {
  const s = await getSession();
  if (!s.shopId) throw new HttpError(401, "not_signed_in");
  const shop = await db.query.shops.findFirst({ where: eq(schema.shops.id, s.shopId) });
  if (!shop) throw new HttpError(401, "not_signed_in");
  return shop;
}

/** Admin API routes use the same password as the admin pages (HTTP Basic, see proxy.ts). */
export function requireAdmin(req: Request) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV === "production") throw new HttpError(503, "admin_not_configured");
    return;
  }
  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const decoded = Buffer.from(header.slice(6), "base64").toString();
    if (decoded.slice(decoded.indexOf(":") + 1) === password) return;
  }
  throw new HttpError(401, "admin_password_needed");
}
