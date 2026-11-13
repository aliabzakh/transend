import bcrypt from "bcryptjs";
import { and, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { CONFIG } from "../config";
import { isCardId } from "../cards/format";
import { HttpError } from "./http";
import { hashPin, isPin } from "./pin";
import { firstName } from "./cards";
import { postMessage } from "./messages";

type Shop = typeof schema.shops.$inferSelect;
export type AreaStatus = "calm" | "tense" | "closed";

export async function shopLogIn(code: string, password: string): Promise<Shop> {
  const shop = await db.query.shops.findFirst({ where: eq(schema.shops.id, String(code ?? "").trim().toUpperCase()) });
  const hash = shop?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinval";
  const good = await bcrypt.compare(String(password ?? ""), hash);
  if (!shop || !good) throw new HttpError(401, "bad_login");
  return shop;
}

/** Per-withdrawal limit in US$ for an area status. "Closed" means no payouts. */
export const limitFor = (status: AreaStatus) =>
  status === "closed" ? 0 : status === "tense" ? CONFIG.maxWithdrawalTenseUsd : CONFIG.maxWithdrawalUsd;

export const cadToUsd = (cad: number) => Math.round(cad * CONFIG.demoRateCadUsd * 100) / 100;

const startOfDayUtc = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

export async function cashPaidTodayUsd(shopId: string): Promise<number> {
  const [r] = await db
    .select({ total: sql<number>`coalesce(sum(${schema.transfers.amountUsd}), 0)` })
    .from(schema.transfers)
    .where(
      and(
        eq(schema.transfers.shopId, shopId),
        eq(schema.transfers.kind, "redeem"),
        gte(schema.transfers.createdAt, startOfDayUtc()),
      ),
    );
  return Number(r?.total ?? 0);
}

export async function areaOf(shop: Shop) {
  const commune = await db.query.communes.findFirst({ where: eq(schema.communes.id, shop.communeId) });
  if (!commune) throw new HttpError(500, "no_area");
  return commune;
}

/** What the shop's home screen shows. Never a card's balance. */
export async function shopView(shop: Shop) {
  const area = await areaOf(shop);
  const paid = await cashPaidTodayUsd(shop.id);
  return {
    shop: { id: shop.id, name: shop.name },
    area: { id: area.id, name: area.name, status: area.status as AreaStatus },
    limitUsd: limitFor(area.status as AreaStatus),
    cashPaidTodayUsd: paid,
    ceilingCad: shop.ceilingCad,
    ceilingUsd: cadToUsd(shop.ceilingCad),
  };
}

export async function setAreaStatus(communeId: string, status: AreaStatus) {
  if (!["calm", "tense", "closed"].includes(status)) throw new HttpError(400, "bad_input");
  const [row] = await db
    .update(schema.communes)
    .set({ status, updatedAt: new Date() })
    .where(eq(schema.communes.id, communeId))
    .returning();
  if (!row) throw new HttpError(404, "not_found");
  return row;
}

async function cardForShop(cardId: string) {
  const id = String(cardId ?? "").trim().toUpperCase();
  if (!isCardId(id)) throw new HttpError(400, "bad_card_id");
  const card = await db.query.cards.findFirst({ where: eq(schema.cards.id, id) });
  if (!card) throw new HttpError(404, "unavailable");
  return card;
}

/** The shop asks to activate a card; the sender sees an approval prompt. */
export async function requestActivation(shop: Shop, cardId: string) {
  const card = await cardForShop(cardId);
  if (card.status !== "Pending" && !(card.status === "Active" && !card.pinHash)) {
    throw new HttpError(409, "already_active");
  }
  await db
    .update(schema.cards)
    .set({ activationShopId: shop.id, activationRequestedAt: new Date() })
    .where(eq(schema.cards.id, card.id));
  if (card.status === "Pending") {
    const r = await db.query.recipients.findFirst({ where: eq(schema.recipients.id, card.recipientId) });
    await postMessage(
      card.senderId,
      card.id,
      "activation",
      "Transend",
      `${shop.name} is asking to activate ${firstName(r?.name ?? "")}'s card. Open the app to approve.`,
    );
  }
  return { cardId: card.id };
}

/** Polled by the shop while it waits: has the sender said yes? */
export async function activationState(shop: Shop, cardId: string) {
  const card = await cardForShop(cardId);
  if (card.activationShopId !== shop.id) throw new HttpError(404, "unavailable");
  if (card.pinHash) return { state: "done" as const };
  return { state: card.status === "Active" ? ("approved" as const) : ("waiting" as const) };
}

/** The recipient sets her one PIN on the shop's phone, after the sender approved. */
export async function setPin(shop: Shop, cardId: string, pin: unknown) {
  if (!isPin(pin)) throw new HttpError(400, "bad_pin");
  const card = await cardForShop(cardId);
  if (card.activationShopId !== shop.id) throw new HttpError(404, "unavailable");
  if (card.status !== "Active") throw new HttpError(409, "not_approved");
  if (card.pinHash) throw new HttpError(409, "pin_already_set");
  const { hash, salt } = await hashPin(pin);
  await db.update(schema.cards).set({ pinHash: hash, pinSalt: salt, wrongPins: 0 }).where(eq(schema.cards.id, card.id));
  return { cardId: card.id };
}
