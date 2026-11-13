import bcrypt from "bcryptjs";
import { Keypair } from "@stellar/stellar-sdk";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { isSanctioned } from "../sanctions";
import { createSponsoredAccount, issueDemoUsdc } from "../stellar/accounts";
import { decryptSecret, encryptSecret } from "./secrets";
import { HttpError } from "./http";

type User = typeof schema.users.$inferSelect;

/** Testnet only: the mocked on-ramp. Enough for a month of sending at the C$2,000 cap. */
export const DEMO_WALLET_USD = 1500;

const normEmail = (e: string) => e.trim().toLowerCase();
const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export async function signUp(emailIn: string, password: string): Promise<User> {
  const email = normEmail(emailIn);
  if (!isEmail(email)) throw new HttpError(400, "bad_email");
  if (typeof password !== "string" || password.length < 8) throw new HttpError(400, "short_password");
  const exists = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (exists) throw new HttpError(409, "email_taken");

  // A custodial demo wallet with no XLM; the sponsor pays its reserves and fees.
  const kp = await createSponsoredAccount();
  await issueDemoUsdc(kp.publicKey(), DEMO_WALLET_USD);
  const [user] = await db
    .insert(schema.users)
    .values({
      email,
      passwordHash: await bcrypt.hash(password, 10),
      stellarPublic: kp.publicKey(),
      stellarSecretEnc: encryptSecret(kp.secret()),
    })
    .returning();
  return user;
}

export async function logIn(emailIn: string, password: string): Promise<User> {
  const user = await db.query.users.findFirst({ where: eq(schema.users.email, normEmail(emailIn)) });
  // Compare even when the user is missing so timing does not reveal which emails exist.
  const hash = user?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinval";
  const good = await bcrypt.compare(String(password ?? ""), hash);
  if (!user || !good) throw new HttpError(401, "bad_login");
  return user;
}

/** Mocked KYC: always passes, unless the name is on the mock sanctions list. Stores no ID image. */
export async function verifyIdentity(user: User, name: string): Promise<void> {
  const clean = String(name ?? "").trim();
  if (!clean) throw new HttpError(400, "bad_input");
  if (isSanctioned(clean)) throw new HttpError(403, "sanctioned");
  await db.update(schema.users).set({ name: clean, kycVerified: true }).where(eq(schema.users.id, user.id));
}

export function senderKeypair(user: User): Keypair {
  if (!user.stellarSecretEnc) throw new HttpError(409, "no_wallet");
  return Keypair.fromSecret(decryptSecret(user.stellarSecretEnc));
}

export function requireVerified(user: User) {
  if (!user.kycVerified) throw new HttpError(403, "not_verified");
}
