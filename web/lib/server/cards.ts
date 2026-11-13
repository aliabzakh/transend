import { and, eq, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { CONFIG, OPEN_DEPARTMENTS } from "../config";
import { isSanctioned } from "../sanctions";
import { randomCardId } from "../cards/format";
import { generateCard } from "../cards/generate";
import { cardsPdf } from "../cards/pdf";
import * as escrow from "../stellar/escrow";
import { HttpError } from "./http";
import { requireVerified, senderKeypair } from "./senders";
import { postMessage } from "./messages";

type User = typeof schema.users.$inferSelect;
export type CardRow = typeof schema.cards.$inferSelect;
export type RecipientRow = typeof schema.recipients.$inferSelect;

export const firstName = (full: string) => full.trim().split(/\s+/)[0] ?? full;

/** The card, if `user` is its sender. Any other caller gets "not_found". */
export async function ownCard(user: User, cardId: string): Promise<{ card: CardRow; recipient: RecipientRow }> {
  const id = String(cardId ?? "").toUpperCase();
  const card = await db.query.cards.findFirst({ where: eq(schema.cards.id, id) });
  if (!card || card.senderId !== user.id) throw new HttpError(404, "not_found");
  const recipient = await db.query.recipients.findFirst({ where: eq(schema.recipients.id, card.recipientId) });
  if (!recipient) throw new HttpError(404, "not_found");
  return { card, recipient };
}

export async function addRecipient(
  user: User,
  input: { name: string; relationship: string; commune: string; department: string },
): Promise<RecipientRow> {
  requireVerified(user);
  const name = String(input.name ?? "").trim();
  const relationship = String(input.relationship ?? "").trim();
  const commune = String(input.commune ?? "").trim();
  const department = String(input.department ?? "");
  if (!name || !relationship || !commune) throw new HttpError(400, "bad_input");
  if (!(OPEN_DEPARTMENTS as readonly string[]).includes(department)) throw new HttpError(400, "department_closed");
  if (isSanctioned(name)) throw new HttpError(403, "sanctioned");
  const [r] = await db
    .insert(schema.recipients)
    .values({ senderId: user.id, name, relationship, commune, department })
    .returning();
  return r;
}

/**
 * Generates a card for one recipient: a fresh card ID, 20 codes and a renewal code.
 * Only the hashes go on-chain (`issue_card`); the plain codes are returned once, in the
 * PDF, and never stored.
 */
export async function issueCard(user: User, recipientId: string): Promise<{ cardId: string; pdf: Uint8Array }> {
  requireVerified(user);
  const recipient = await db.query.recipients.findFirst({ where: eq(schema.recipients.id, recipientId) });
  if (!recipient || recipient.senderId !== user.id) throw new HttpError(404, "not_found");
  const existing = await db.query.cards.findFirst({
    where: and(eq(schema.cards.recipientId, recipientId), ne(schema.cards.status, "Retired")),
  });
  if (existing) throw new HttpError(409, "card_exists", { cardId: existing.id });
  const all = await db.select({ id: schema.cards.id }).from(schema.cards).where(eq(schema.cards.senderId, user.id));
  if (all.length >= 3) throw new HttpError(409, "too_many_cards");

  let cardId = randomCardId();
  while (await db.query.cards.findFirst({ where: eq(schema.cards.id, cardId) })) cardId = randomCardId();
  const secrets = generateCard(cardId);
  const res = await escrow.issueCard(senderKeypair(user), cardId, secrets.hashes, secrets.renewalHash);
  await db.insert(schema.cards).values({ id: cardId, senderId: user.id, recipientId, pdfIssuedAt: new Date() });
  await db.insert(schema.transfers).values({ kind: "issue", cardId, senderId: user.id, txHash: res.hash });
  const pdf = await cardsPdf([secrets]);
  return { cardId, pdf };
}

/** "Yes, that's her": the sender approves a shop's activation request. */
export async function approveActivation(user: User, cardId: string) {
  const { card, recipient } = await ownCard(user, cardId);
  if (card.status !== "Pending") throw new HttpError(409, "not_pending");
  if (!card.activationRequestedAt) throw new HttpError(409, "no_request");
  const res = await escrow.activate(senderKeypair(user), card.id);
  await db.update(schema.cards).set({ status: "Active" }).where(eq(schema.cards.id, card.id));
  await db.insert(schema.transfers).values({ kind: "activate", cardId: card.id, senderId: user.id, txHash: res.hash });
  await postMessage(user.id, card.id, "info", "Transend", `${firstName(recipient.name)}'s card is active.`, res.hash);
  return { txHash: res.hash };
}

export async function freezeCard(user: User, cardId: string) {
  const { card } = await ownCard(user, cardId);
  if (card.status !== "Active") throw new HttpError(409, "not_active");
  const res = await escrow.freezeBySender(senderKeypair(user), card.id);
  await db.update(schema.cards).set({ status: "Frozen" }).where(eq(schema.cards.id, card.id));
  await db.insert(schema.transfers).values({ kind: "freeze", cardId: card.id, senderId: user.id, txHash: res.hash });
  return { txHash: res.hash };
}

export async function unfreezeCard(user: User, cardId: string) {
  const { card } = await ownCard(user, cardId);
  if (card.status !== "Frozen") throw new HttpError(409, "not_frozen");
  const res = await escrow.unfreeze(senderKeypair(user), card.id);
  await db.update(schema.cards).set({ status: "Active", wrongPins: 0 }).where(eq(schema.cards.id, card.id));
  await db.insert(schema.transfers).values({ kind: "unfreeze", cardId: card.id, senderId: user.id, txHash: res.hash });
  return { txHash: res.hash };
}

export const linesPerCard = CONFIG.linesPerCard;
