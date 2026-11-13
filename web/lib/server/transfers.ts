import { and, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { CONFIG } from "../config";
import { quote } from "../quote";
import * as escrow from "../stellar/escrow";
import { HttpError } from "./http";
import { requireVerified, senderKeypair } from "./senders";
import { firstName, ownCard } from "./cards";
import { postMessage } from "./messages";

type User = typeof schema.users.$inferSelect;

const startOfMonthUtc = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
};

/** C$ sent by this sender in the last 24 hours and this calendar month (UTC), all cards together. */
export async function sentTotals(senderId: string): Promise<{ dayCad: number; monthCad: number }> {
  const sum = async (since: Date) => {
    const [r] = await db
      .select({ total: sql<number>`coalesce(sum(${schema.transfers.amountCad}), 0)` })
      .from(schema.transfers)
      .where(
        and(
          eq(schema.transfers.senderId, senderId),
          eq(schema.transfers.kind, "deposit"),
          gte(schema.transfers.createdAt, since),
        ),
      );
    return Number(r?.total ?? 0);
  };
  return { dayCad: await sum(new Date(Date.now() - 86_400_000)), monthCad: await sum(startOfMonthUtc()) };
}

/** A firm quote for 30 seconds: the flat fee, the demo rate with its markup, and the US$ out. */
export async function createQuote(user: User, cardId: string, amountCad: number) {
  requireVerified(user);
  const { card } = await ownCard(user, cardId);
  if (card.status === "Frozen") throw new HttpError(409, "card_on_hold");
  if (card.status === "Retired") throw new HttpError(409, "card_retired");
  const q = quote(Number(amountCad));
  if (!q.ok) throw new HttpError(400, q.reason);
  const { dayCad, monthCad } = await sentTotals(user.id);
  if (dayCad + q.amountCad > CONFIG.maxPerDayCad) throw new HttpError(409, "over_day", { leftCad: CONFIG.maxPerDayCad - dayCad });
  if (monthCad + q.amountCad > CONFIG.maxPerMonthCad) {
    throw new HttpError(409, "over_month", { leftCad: CONFIG.maxPerMonthCad - monthCad });
  }
  const chain = await escrow.getCard(card.id);
  if (chain && chain.balanceUsd + q.usdOut > CONFIG.maxCardBalanceUsd) throw new HttpError(409, "over_card");

  const expiresAt = new Date(Date.now() + CONFIG.quoteSeconds * 1000);
  const [row] = await db
    .insert(schema.quotes)
    .values({
      senderId: user.id,
      cardId: card.id,
      amountCad: q.amountCad,
      feeCad: q.feeCad,
      rate: q.rate,
      usdOut: q.usdOut,
      expiresAt,
    })
    .returning();
  return {
    quoteId: row.id,
    cardId: card.id,
    amountCad: q.amountCad,
    feeCad: q.feeCad,
    rate: q.rate,
    usdOut: q.usdOut,
    allInPct: q.allInPct,
    expiresAt: expiresAt.toISOString(),
  };
}

/** Sends against a quote: testnet USDC moves from the sender's wallet into the escrow under the card. */
export async function sendQuote(user: User, quoteId: string) {
  requireVerified(user);
  const q = await db.query.quotes.findFirst({ where: eq(schema.quotes.id, String(quoteId ?? "")) });
  if (!q || q.senderId !== user.id) throw new HttpError(404, "not_found");
  if (q.usedAt) throw new HttpError(409, "quote_used");
  if (q.expiresAt.getTime() < Date.now()) throw new HttpError(409, "quote_expired");
  // Claim the quote before moving money so a double tap cannot send twice.
  const claimed = await db
    .update(schema.quotes)
    .set({ usedAt: new Date() })
    .where(and(eq(schema.quotes.id, q.id), sql`${schema.quotes.usedAt} is null`))
    .returning();
  if (claimed.length === 0) throw new HttpError(409, "quote_used");

  const { dayCad, monthCad } = await sentTotals(user.id);
  if (dayCad + q.amountCad > CONFIG.maxPerDayCad) throw new HttpError(409, "over_day");
  if (monthCad + q.amountCad > CONFIG.maxPerMonthCad) throw new HttpError(409, "over_month");

  const { card, recipient } = await ownCard(user, q.cardId);
  let res;
  try {
    res = await escrow.deposit(senderKeypair(user), card.id, q.usdOut);
  } catch (e) {
    // Nothing moved: release the quote so the sender can retry while it is still valid.
    await db.update(schema.quotes).set({ usedAt: null }).where(eq(schema.quotes.id, q.id));
    const name = escrow.escrowErrorName(e);
    if (name === "OverBalanceLimit") throw new HttpError(409, "over_card");
    if (name === "OverDailyLoad") throw new HttpError(409, "over_card_day");
    if (name === "TooManySenders") throw new HttpError(409, "too_many_senders");
    if (name === "Frozen") throw new HttpError(409, "card_on_hold");
    throw e;
  }
  await db.insert(schema.transfers).values({
    kind: "deposit",
    cardId: card.id,
    senderId: user.id,
    amountUsd: q.usdOut,
    amountCad: q.amountCad,
    txHash: res.hash,
  });
  await postMessage(
    user.id,
    card.id,
    "sent",
    "Transend",
    `Sent C$${q.amountCad.toFixed(2)}. US$${q.usdOut.toFixed(2)} waiting for ${firstName(recipient.name)}.`,
    res.hash,
  );
  return { txHash: res.hash, cardId: card.id, usdOut: q.usdOut, amountCad: q.amountCad };
}
