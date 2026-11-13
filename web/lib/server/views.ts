/** Typed view-models for the sender app. Screens read these; they never see keys or hashes. */
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import * as escrow from "../stellar/escrow";
import { savingsSplit } from "../savings/rules";
import { sentTotals } from "./transfers";

type User = typeof schema.users.$inferSelect;
const cents = (n: number) => Math.round(n * 100) / 100;

export type SenderCard = {
  id: string;
  status: "Pending" | "Active" | "Frozen" | "Retired";
  availableUsd: number;
  setAsideUsd: number;
  earnedUsd: number;
  totalUsd: number;
  linesUsed: number;
  activationRequested: boolean;
  activationShop: string | null;
  pinSet: boolean;
};
export type SenderRecipient = {
  id: string;
  name: string;
  relationship: string;
  commune: string;
  department: string;
  card: SenderCard | null;
};
export type InboxItem = { id: number; at: string; kind: string; from: string; text: string; txHash: string | null };
export type SenderView = {
  email: string;
  name: string | null;
  verified: boolean;
  recipients: SenderRecipient[];
  activity: InboxItem[];
  sentTodayCad: number;
  sentMonthCad: number;
  savings: { apyBps: number; speedup: number };
};

export async function inbox(user: User, limit = 50): Promise<InboxItem[]> {
  const rows = await db
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.senderId, user.id))
    .orderBy(desc(schema.messages.createdAt), desc(schema.messages.id))
    .limit(limit);
  return rows.map((m) => ({
    id: m.id,
    at: m.createdAt.toISOString(),
    kind: m.kind,
    from: m.fromLabel,
    text: m.text,
    txHash: m.txHash,
  }));
}

export async function senderView(user: User): Promise<SenderView> {
  const [recipients, cards, cfg, totals, activity] = await Promise.all([
    db.select().from(schema.recipients).where(eq(schema.recipients.senderId, user.id)).orderBy(schema.recipients.createdAt),
    db.select().from(schema.cards).where(eq(schema.cards.senderId, user.id)),
    escrow.getSavings(),
    sentTotals(user.id),
    inbox(user, 20),
  ]);
  const live = cards.filter((c) => c.status !== "Retired");
  const chain = await Promise.all(live.map((c) => escrow.getCard(c.id).catch(() => null)));
  const shopNames = new Map(
    (await db.select({ id: schema.shops.id, name: schema.shops.name }).from(schema.shops)).map((s) => [s.id, s.name]),
  );

  const cardFor = (recipientId: string): SenderCard | null => {
    const i = live.findIndex((c) => c.recipientId === recipientId);
    if (i < 0) return null;
    const row = live[i];
    const c = chain[i];
    const split = c ? savingsSplit(c) : { availableUsd: 0, setAsideUsd: 0, totalUsd: 0 };
    return {
      id: row.id,
      // The chain is the source of truth for status when it can be read.
      status: c?.status ?? row.status,
      ...split,
      earnedUsd: c ? cents(c.yieldCreditedUsd + escrow.pendingYieldUsd(c, cfg)) : 0,
      linesUsed: c?.linesUsed ?? 0,
      activationRequested: row.status === "Pending" && !!row.activationRequestedAt,
      activationShop: row.activationShopId ? (shopNames.get(row.activationShopId) ?? null) : null,
      pinSet: !!row.pinHash,
    };
  };

  return {
    email: user.email,
    name: user.name,
    verified: user.kycVerified,
    recipients: recipients.map((r) => ({
      id: r.id,
      name: r.name,
      relationship: r.relationship,
      commune: r.commune,
      department: r.department,
      card: cardFor(r.id),
    })),
    activity,
    sentTodayCad: totals.dayCad,
    sentMonthCad: totals.monthCad,
    savings: { apyBps: cfg.apyBps, speedup: cfg.speedup },
  };
}
