/**
 * Demo data on testnet: communes, shops, the demo sender and printable demo cards.
 * Used by `npm run seed:demo` and by /admin/cards. Nothing here is real money.
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { createSponsoredAccount, issueDemoUsdc } from "../stellar/accounts";
import { cardsPdf } from "../cards/pdf";
import type { CardSecrets } from "../cards/generate";
import { encryptSecret } from "./secrets";
import { DEMO_WALLET_USD } from "./senders";
import { issueCard } from "./cards";

export const DEMO_SENDER = { email: "jean@transend.demo", name: "Jean Baptiste" };
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "transend-demo";
export const SHOP_PASSWORD = process.env.SHOP_DEMO_PASSWORD || "transend-shop";

export const COMMUNES = [
  { id: "mole", name: "Môle-Saint-Nicolas", department: "Nord-Ouest", lat: 19.806, lng: -73.375 },
  { id: "anse", name: "Anse-à-Foleur", department: "Nord-Ouest", lat: 19.9, lng: -72.62 },
  { id: "bassin", name: "Bassin-Bleu", department: "Nord-Ouest", lat: 19.785, lng: -72.81 },
];

export const SHOPS = [
  { id: "S-101", name: "Boutik Marie-Ange", communeId: "mole", lat: 19.807, lng: -73.377 },
  { id: "S-102", name: "Boutik Delva", communeId: "mole", lat: 19.803, lng: -73.371 },
  { id: "S-201", name: "Boutik Louissaint", communeId: "anse", lat: 19.901, lng: -72.622 },
];

export async function ensureCommunesAndShops(log = console.log) {
  for (const c of COMMUNES) {
    await db.insert(schema.communes).values(c).onConflictDoNothing();
  }
  const hash = await bcrypt.hash(SHOP_PASSWORD, 10);
  for (const s of SHOPS) {
    const existing = await db.query.shops.findFirst({ where: eq(schema.shops.id, s.id) });
    if (existing?.stellarPublic) continue;
    // The shop's testnet account stands in for its MonCash or Fonkoze settlement account.
    const kp = await createSponsoredAccount();
    await db
      .insert(schema.shops)
      .values({ ...s, passwordHash: hash, stellarPublic: kp.publicKey(), stellarSecretEnc: encryptSecret(kp.secret()) })
      .onConflictDoUpdate({
        target: schema.shops.id,
        set: { stellarPublic: kp.publicKey(), stellarSecretEnc: encryptSecret(kp.secret()) },
      });
    log(`  shop ${s.id} ${s.name}: ${kp.publicKey()}`);
  }
}

/** A verified demo sender with a funded custodial wallet. Reused if it already exists. */
export async function ensureSender(email: string, name: string) {
  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (existing) return existing;
  const kp = await createSponsoredAccount();
  await issueDemoUsdc(kp.publicKey(), DEMO_WALLET_USD);
  const [user] = await db
    .insert(schema.users)
    .values({
      email,
      name,
      kycVerified: true,
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
      stellarPublic: kp.publicKey(),
      stellarSecretEnc: encryptSecret(kp.secret()),
    })
    .returning();
  return user;
}

const PRINT_NAMES = ["Rose", "Marthe", "Nadège", "Yvette", "Lucienne", "Mireille", "Solange", "Clotilde"];

/**
 * Makes `n` printable demo cards and returns one PDF with all of them. The contract
 * allows 3 cards per sender, so the cards are spread over demo senders
 * print-1@transend.demo, print-2@... (password DEMO_PASSWORD), 3 cards each.
 */
export async function bulkDemoCards(n: number): Promise<{ pdf: Uint8Array; cardIds: string[] }> {
  const count = Math.max(1, Math.min(30, Math.floor(n)));
  // Find senders with free card slots, then create more as needed (one at a time: the sponsor signs each).
  const plan: { user: typeof schema.users.$inferSelect; slots: number }[] = [];
  let need = count;
  for (let i = 1; need > 0; i++) {
    const user = await ensureSender(`print-${i}@transend.demo`, `Demo sender ${i}`);
    const used = await db
      .select({ id: schema.cards.id })
      .from(schema.cards)
      .where(eq(schema.cards.senderId, user.id));
    const slots = Math.min(3 - used.length, need);
    if (slots > 0) {
      plan.push({ user, slots });
      need -= slots;
    }
  }
  // Each sender signs its own transactions, so senders can run in parallel.
  const results = await Promise.all(
    plan.map(async ({ user, slots }) => {
      const out: CardSecrets[] = [];
      for (let k = 0; k < slots; k++) {
        const name = `${PRINT_NAMES[(out.length + user.email.length + k) % PRINT_NAMES.length]} Demo`;
        const [r] = await db
          .insert(schema.recipients)
          .values({ senderId: user.id, name, relationship: "Demo", commune: "Môle-Saint-Nicolas", department: "Nord-Ouest" })
          .returning();
        out.push((await issueCard(user, r.id)).secrets);
      }
      return out;
    }),
  );
  const cards = results.flat();
  return { pdf: await cardsPdf(cards), cardIds: cards.map((c) => c.cardId) };
}
