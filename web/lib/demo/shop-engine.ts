"use client";
/**
 * Fake verification service for the clickable shop demo. It runs in the browser and
 * keeps everything in memory, including the demo PINs, which are never written to
 * storage, a URL or a log. Stage 2 replaces this with POST /api/redeem and friends.
 */
import { useSyncExternalStore } from "react";
import { CONFIG } from "../config";
import { demoCode, normalizeCode } from "./codes";
import type { AreaStatus } from "./areas";

type EngineCard = {
  pin: string | null;
  duress: string | null;
  balanceUsd: number;
  used: Set<number>;
  withdrawalsToday: number;
  wrongPins: number;
  frozen: boolean;
};

export type DeclineReason =
  | "wrong_pin"
  | "wrong_code"
  | "code_used"
  | "over_limit"
  | "area_closed"
  | "shop_cash"
  | "no_signal"
  | "not_enough"
  | "unavailable"
  | "too_many";

export type RedeemResult =
  | { ok: true; payUsd: number; cardId: string; line: number; at: string }
  | { ok: false; reason: DeclineReason; limitUsd?: number };

export type ShopState = {
  loggedIn: boolean;
  shopName: string;
  area: AreaStatus;
  cashPaidTodayUsd: number;
  offline: boolean;
};

const cashCeilingUsd = () => Math.round(CONFIG.shopCashCeilingCad * CONFIG.demoRateCadUsd * 100) / 100;

const cards = new Map<string, EngineCard>();
cards.set("TS4F2K9Q", {
  pin: "1234",
  duress: "4321",
  balanceUsd: 137.39,
  used: new Set([1, 2, 3]),
  withdrawalsToday: 0,
  wrongPins: 0,
  frozen: false,
});

const SEED_SHOP: ShopState = {
  loggedIn: false,
  shopName: "Boutik Marie-Ange",
  area: "calm",
  cashPaidTodayUsd: 60,
  offline: false,
};
let state: ShopState = SEED_SHOP;
const listeners = new Set<() => void>();
const set = (next: ShopState) => {
  state = next;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useShop = () =>
  useSyncExternalStore(
    subscribe,
    () => state,
    () => SEED_SHOP,
  );

export const login = () => set({ ...state, loggedIn: true });
export const setArea = (area: AreaStatus) => set({ ...state, area });
export const setOffline = (offline: boolean) => set({ ...state, offline });
export const currentLimitUsd = () =>
  state.area === "tense" ? CONFIG.maxWithdrawalTenseUsd : CONFIG.maxWithdrawalUsd;

const round = (n: number) => Math.round(n * 100) / 100;

/** Activation: the sender approves, then the recipient sets two different PINs. */
export function activate(cardId: string, pin: string, duress: string): { ok: true } | { ok: false } {
  if (pin === duress) return { ok: false };
  const existing = cards.get(cardId);
  cards.set(cardId, {
    pin,
    duress,
    balanceUsd: existing?.balanceUsd ?? 0,
    used: existing?.used ?? new Set(),
    withdrawalsToday: 0,
    wrongPins: 0,
    frozen: false,
  });
  return { ok: true };
}

export function balanceFor(cardId: string, pin: string): { ok: true; balanceUsd: number } | { ok: false; reason: DeclineReason } {
  if (state.offline) return { ok: false, reason: "no_signal" };
  const c = cards.get(cardId);
  if (!c || !c.pin) return { ok: false, reason: "unavailable" };
  if (c.frozen) return { ok: false, reason: "unavailable" };
  if (pin !== c.pin && pin !== c.duress) return { ok: false, reason: wrongPin(c) };
  return { ok: true, balanceUsd: c.balanceUsd };
}

function wrongPin(c: EngineCard): DeclineReason {
  c.wrongPins += 1;
  if (c.wrongPins >= 5) {
    c.frozen = true; // five wrong PINs freeze the card
    return "too_many";
  }
  return "wrong_pin";
}

/**
 * Same order of checks as the real service: signal, card, area, PIN, code, limits.
 * A duress PIN pays the preset amount, freezes the card, and returns the same
 * result shape as a normal approval.
 */
export function redeem(input: {
  cardId: string;
  line: number;
  code: string;
  amountUsd: number;
  pin: string;
}): RedeemResult {
  const { cardId, line, amountUsd, pin } = input;
  if (state.offline) return { ok: false, reason: "no_signal" };
  if (state.area === "closed") return { ok: false, reason: "area_closed" };
  const c = cards.get(cardId);
  if (!c || !c.pin) return { ok: false, reason: "unavailable" };
  if (c.frozen) return { ok: false, reason: "unavailable" };

  const isDuress = pin === c.duress;
  if (pin !== c.pin && !isDuress) return { ok: false, reason: wrongPin(c) };
  c.wrongPins = 0;

  if (line < 1 || line > CONFIG.linesPerCard) return { ok: false, reason: "wrong_code" };
  if (c.used.has(line)) return { ok: false, reason: "code_used" };
  if (normalizeCode(input.code) !== demoCode(cardId, line)) return { ok: false, reason: "wrong_code" };

  const limit = currentLimitUsd();
  if (!isDuress && amountUsd > limit) return { ok: false, reason: "over_limit", limitUsd: limit };
  if (c.withdrawalsToday >= CONFIG.maxWithdrawalsPerDay) return { ok: false, reason: "over_limit" };
  if (amountUsd > c.balanceUsd) return { ok: false, reason: "not_enough" };

  const pay = isDuress ? Math.min(CONFIG.duressDefaultUsd, c.balanceUsd) : amountUsd;
  if (state.cashPaidTodayUsd + pay > cashCeilingUsd()) return { ok: false, reason: "shop_cash" };

  c.used.add(line);
  c.balanceUsd = round(c.balanceUsd - pay);
  c.withdrawalsToday += 1;
  if (isDuress) c.frozen = true;
  set({ ...state, cashPaidTodayUsd: round(state.cashPaidTodayUsd + pay) });
  return { ok: true, payUsd: pay, cardId, line, at: new Date().toISOString() };
}

// The pay-out form hands its fields to the PIN screen without using a URL.
let pending: { cardId: string; line: number; code: string; amountUsd: number } | null = null;
export const setPending = (p: typeof pending) => {
  pending = p;
};
export const getPending = () => pending;
let lastResult: RedeemResult | null = null;
export const setLastResult = (r: RedeemResult | null) => {
  lastResult = r;
};
export const getLastResult = () => lastResult;
