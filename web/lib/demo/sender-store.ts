"use client";
/**
 * Fake sender data for the clickable demo. Persisted in sessionStorage so a page
 * refresh keeps the story. Holds no PIN or secret of any kind. Stage 2 replaces
 * this module with calls to the API; screens only use the hooks and actions here.
 */
import { useSyncExternalStore } from "react";
import type { Department } from "../config";
import { newCardId } from "./codes";

export type CardStatus = "Pending" | "Active" | "Frozen" | "Retired";
export type Recipient = {
  id: string;
  name: string;
  relationship: string;
  commune: string;
  department: Department;
  cardId: string;
};
export type Card = {
  id: string;
  recipientId: string;
  status: CardStatus;
  balanceUsd: number;
  linesUsed: number;
  activationRequested: boolean;
};
export type Activity = {
  id: string;
  at: string; // ISO
  kind: "sent" | "pickup" | "reply" | "hold" | "info";
  text: string;
};
export type Inbox = { id: string; at: string; from: string; text: string };
export type State = {
  signedUp: boolean;
  verified: boolean;
  recipients: Recipient[];
  cards: Card[];
  activity: Activity[];
  inbox: Inbox[];
  sentTodayCad: number;
  sentMonthCad: number;
};

const KEY = "transend-sender-demo-v1";
const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

export const SEED: State = {
  signedUp: false,
  verified: false,
  recipients: [
    {
      id: "r1",
      name: "Odette Pierre",
      relationship: "Mother",
      commune: "Môle-Saint-Nicolas",
      department: "Nord-Ouest",
      cardId: "TS4F2K9Q",
    },
  ],
  cards: [
    {
      id: "TS4F2K9Q",
      recipientId: "r1",
      status: "Active",
      balanceUsd: 137.39,
      linesUsed: 3,
      activationRequested: false,
    },
  ],
  activity: [
    { id: "a2", at: ago(60 * 24 * 3), kind: "pickup", text: "Odette Pierre has the money (US$60.00)" },
    { id: "a1", at: ago(60 * 24 * 9), kind: "sent", text: "Sent C$200.00. US$137.39 waiting for Odette Pierre" },
  ],
  inbox: [
    { id: "m2", at: ago(60 * 24 * 3), from: "Transend", text: "Odette Pierre has the money (US$60.00)." },
    { id: "m1", at: ago(60 * 24 * 3 - 5), from: "Odette Pierre", text: "Received, thank you" },
  ],
  sentTodayCad: 0,
  sentMonthCad: 200,
};

let state: State = SEED;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (raw) state = JSON.parse(raw) as State;
  } catch {
    /* storage can be blocked: keep the seed */
  }
}
function set(next: State) {
  state = next;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => {
  load();
  return state;
};

export const useSender = () => useSyncExternalStore(subscribe, getSnapshot, () => SEED);

const uid = () => Math.random().toString(36).slice(2, 9);
const now = () => new Date().toISOString();

// ---- actions ----

export function signUp() {
  set({ ...getSnapshot(), signedUp: true });
}
export function verifyIdentity() {
  set({ ...getSnapshot(), verified: true });
}

export function addRecipient(input: Omit<Recipient, "id" | "cardId">): { recipient: Recipient } {
  const s = getSnapshot();
  const cardId = newCardId();
  const recipient: Recipient = { ...input, id: `r${uid()}`, cardId };
  const card: Card = {
    id: cardId,
    recipientId: recipient.id,
    status: "Pending",
    balanceUsd: 0,
    linesUsed: 0,
    activationRequested: false,
  };
  set({ ...s, recipients: [...s.recipients, recipient], cards: [...s.cards, card] });
  return { recipient };
}

function patchCard(id: string, patch: Partial<Card>, s = getSnapshot()): State {
  return { ...s, cards: s.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) };
}
const withActivity = (s: State, a: Omit<Activity, "id" | "at">): State => ({
  ...s,
  activity: [{ id: uid(), at: now(), ...a }, ...s.activity],
});
const withInbox = (s: State, from: string, text: string): State => ({
  ...s,
  inbox: [{ id: uid(), at: now(), from, text }, ...s.inbox],
});

/** Demo control: a shop has asked to activate this card. */
export function simulateShopRequest(cardId: string) {
  set(patchCard(cardId, { activationRequested: true }));
}
/** "Yes, that's her". */
export function approveActivation(cardId: string) {
  set(patchCard(cardId, { status: "Active", activationRequested: false }));
}
export function freezeCard(cardId: string) {
  set(patchCard(cardId, { status: "Frozen" }));
}
export function unfreezeCard(cardId: string) {
  set(patchCard(cardId, { status: "Active" }));
}

export function send(cardId: string, amountCad: number, usdOut: number) {
  const s = getSnapshot();
  const card = s.cards.find((c) => c.id === cardId)!;
  const r = s.recipients.find((x) => x.id === card.recipientId)!;
  let next = patchCard(cardId, { balanceUsd: round(card.balanceUsd + usdOut) }, s);
  next = {
    ...next,
    sentTodayCad: s.sentTodayCad + amountCad,
    sentMonthCad: s.sentMonthCad + amountCad,
  };
  next = withActivity(next, {
    kind: "sent",
    text: `Sent C$${amountCad.toFixed(2)}. US$${usdOut.toFixed(2)} waiting for ${r.name}`,
  });
  set(next);
}

/** Demo control: the recipient collects at a shop. */
export function simulatePickup(cardId: string, amountUsd: number) {
  const s = getSnapshot();
  const card = s.cards.find((c) => c.id === cardId)!;
  const r = s.recipients.find((x) => x.id === card.recipientId)!;
  const amt = Math.min(amountUsd, card.balanceUsd);
  let next = patchCard(
    cardId,
    { balanceUsd: round(card.balanceUsd - amt), linesUsed: card.linesUsed + 1 },
    s,
  );
  next = withActivity(next, { kind: "pickup", text: `${r.name} has the money (US$${amt.toFixed(2)})` });
  next = withInbox(next, "Transend", `${r.name} has the money (US$${amt.toFixed(2)}).`);
  next = withInbox(next, r.name, "Received, thank you");
  set(next);
}

export function resetDemo() {
  loaded = true;
  set(SEED);
}

const round = (n: number) => Math.round(n * 100) / 100;
