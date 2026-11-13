/**
 * The verification service. A shop never talks to Stellar: it sends the card ID,
 * line, code, amount and PIN here. This checks the PIN, the area's risk level and
 * the shop's cash ceiling, then signs the redeem as the verifier; the sponsor pays
 * the fee. The PIN is never logged, stored in the clear or put on-chain.
 */
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { CONFIG } from "../config";
import { isCardId, isCode, normalizeCode } from "../cards/format";
import * as escrow from "../stellar/escrow";
import { ChainError } from "../stellar/submit";
import { HttpError } from "./http";
import { isPin, verifyPin } from "./pin";
import { areaOf, cadToUsd, cashPaidTodayUsd, limitFor, type AreaStatus } from "./shops";
import { firstName } from "./cards";
import { postMessage } from "./messages";

type Shop = typeof schema.shops.$inferSelect;
type Card = typeof schema.cards.$inferSelect;

export type DeclineReason =
  | "wrong_pin"
  | "wrong_code"
  | "code_used"
  | "over_limit"
  | "daily_count"
  | "area_closed"
  | "shop_cash"
  | "no_signal"
  | "not_enough"
  | "unavailable"
  | "too_many";

export class Declined extends HttpError {
  constructor(reason: DeclineReason, extra: Record<string, unknown> = {}) {
    super(422, reason, extra);
  }
}

async function loadCard(cardId: string): Promise<Card> {
  const id = String(cardId ?? "").trim().toUpperCase();
  if (!isCardId(id)) throw new Declined("unavailable");
  const card = await db.query.cards.findFirst({ where: eq(schema.cards.id, id) });
  if (!card || !card.pinHash || !card.pinSalt) throw new Declined("unavailable");
  if (card.status !== "Active") throw new Declined("unavailable");
  return card;
}

/** Checks the PIN. Five wrong PINs in a row freeze the card on-chain; the sender unfreezes it. */
async function checkPin(card: Card, pin: unknown): Promise<void> {
  if (isPin(pin) && (await verifyPin(pin, card.pinHash!, card.pinSalt!))) {
    if (card.wrongPins) await db.update(schema.cards).set({ wrongPins: 0 }).where(eq(schema.cards.id, card.id));
    return;
  }
  const wrong = card.wrongPins + 1;
  if (wrong < CONFIG.maxWrongPins) {
    await db.update(schema.cards).set({ wrongPins: wrong }).where(eq(schema.cards.id, card.id));
    throw new Declined("wrong_pin");
  }
  let txHash: string | undefined;
  try {
    txHash = (await escrow.freezeByVerifier(card.id)).hash;
  } catch (e) {
    console.error("freeze after wrong PINs failed:", e instanceof Error ? e.message : e);
  }
  await db.update(schema.cards).set({ wrongPins: wrong, status: "Frozen" }).where(eq(schema.cards.id, card.id));
  await db.insert(schema.transfers).values({ kind: "freeze", cardId: card.id, txHash });
  const r = await db.query.recipients.findFirst({ where: eq(schema.recipients.id, card.recipientId) });
  await postMessage(
    card.senderId,
    card.id,
    "hold",
    "Transend",
    `Please call ${firstName(r?.name ?? "")}. The card is on hold.`,
    txHash,
  );
  throw new Declined("too_many");
}

const CONTRACT_TO_REASON: Partial<Record<escrow.EscrowErrorName, DeclineReason>> = {
  CodeUsed: "code_used",
  BadCode: "wrong_code",
  BadLine: "wrong_code",
  OverWithdrawalLimit: "over_limit",
  TooManyWithdrawals: "daily_count",
  InsufficientBalance: "not_enough",
  InsufficientLiquid: "not_enough",
  Frozen: "unavailable",
  NotActive: "unavailable",
  Paused: "unavailable",
  NotFound: "unavailable",
};

export type RedeemInput = { cardId: string; line: number; code: string; amountUsd: number; pin: string };

export async function redeemForShop(shop: Shop, input: RedeemInput) {
  const line = Number(input.line);
  const amount = Math.round(Number(input.amountUsd) * 100) / 100;
  const code = normalizeCode(String(input.code ?? ""));
  if (!Number.isInteger(line) || line < 1 || line > CONFIG.linesPerCard || !isCode(code)) {
    throw new Declined("wrong_code");
  }
  if (!(amount > 0)) throw new HttpError(400, "bad_amount");

  const card = await loadCard(input.cardId);
  const area = await areaOf(shop);
  const status = area.status as AreaStatus;
  if (status === "closed") throw new Declined("area_closed");
  await checkPin(card, input.pin);

  const limit = limitFor(status);
  if (amount > limit) throw new Declined("over_limit", { limitUsd: limit });
  const paid = await cashPaidTodayUsd(shop.id);
  if (paid + amount > cadToUsd(shop.ceilingCad)) throw new Declined("shop_cash");
  if (!shop.stellarPublic) throw new HttpError(500, "shop_has_no_account");

  let res;
  try {
    res = await escrow.redeem(card.id, line, code, amount, shop.stellarPublic);
  } catch (e) {
    const name = escrow.escrowErrorName(e);
    if (name && CONTRACT_TO_REASON[name]) throw new Declined(CONTRACT_TO_REASON[name]!);
    if (e instanceof ChainError) throw new Declined("no_signal");
    throw e;
  }

  const at = new Date();
  await db.insert(schema.transfers).values({
    kind: "redeem",
    cardId: card.id,
    senderId: card.senderId,
    shopId: shop.id,
    amountUsd: amount,
    line,
    txHash: res.hash,
    createdAt: at,
  });
  const r = await db.query.recipients.findFirst({ where: eq(schema.recipients.id, card.recipientId) });
  await postMessage(
    card.senderId,
    card.id,
    "pickup",
    "Transend",
    `${firstName(r?.name ?? "")} has the money (US$${amount.toFixed(2)}).`,
    res.hash,
  );
  return { payUsd: amount, cardId: card.id, line, at: at.toISOString(), txHash: res.hash };
}

/** Card ID + PIN at any shop: shows only what she can collect now ("Available now"). */
export async function balanceForShop(cardId: string, pin: unknown) {
  const card = await loadCard(cardId);
  await checkPin(card, pin);
  try {
    return { availableUsd: await escrow.liquidBalanceUsd(card.id) };
  } catch (e) {
    if (e instanceof ChainError) throw new Declined("no_signal");
    throw e;
  }
}

export const PRESET_REPLIES = ["Received, thank you", "All is well", "Please call me"] as const;

/** A preset reply from the recipient, sent from a shop that has served her card. */
export async function replyFromRecipient(shop: Shop, cardId: string, choice: number) {
  const text = PRESET_REPLIES[choice];
  if (!text) throw new HttpError(400, "bad_input");
  const id = String(cardId ?? "").trim().toUpperCase();
  const card = await db.query.cards.findFirst({ where: eq(schema.cards.id, id) });
  if (!card) throw new HttpError(404, "unavailable");
  const served =
    card.activationShopId === shop.id ||
    (await db.query.transfers.findFirst({
      where: and(eq(schema.transfers.cardId, card.id), eq(schema.transfers.shopId, shop.id)),
    }));
  if (!served) throw new HttpError(403, "not_served_here");
  const r = await db.query.recipients.findFirst({ where: eq(schema.recipients.id, card.recipientId) });
  await postMessage(card.senderId, card.id, "reply", firstName(r?.name ?? "Your family"), text);
  return { sent: true };
}
