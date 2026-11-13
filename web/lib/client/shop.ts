"use client";
/**
 * Shop app data and actions. The shop never talks to Stellar: it sends the code and
 * PIN to the verification service. The PIN is passed straight through to the API
 * and never kept here, in a URL, in storage or in a log.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiGet, apiPost } from "./api";

export type AreaStatus = "calm" | "tense" | "closed";
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

export type ShopView = {
  shop: { id: string; name: string };
  area: { id: string; name: string; status: AreaStatus };
  limitUsd: number;
  cashPaidTodayUsd: number;
  ceilingCad: number;
  ceilingUsd: number;
};

export function useShop() {
  const router = useRouter();
  const [view, setView] = useState<ShopView | null>(null);
  const [offline, setOffline] = useState(false);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const v = await apiGet<ShopView & { ok: true }>("/api/shop/me");
      if (alive.current) {
        setView(v);
        setOffline(false);
      }
    } catch (e) {
      if (!alive.current) return;
      if (e instanceof ApiError && e.status === 401) router.replace("/shop/login");
      else setOffline(true);
    }
  }, [router]);

  useEffect(() => {
    alive.current = true;
    refresh();
    // On a dropped connection keep retrying quietly; the screen says "Waiting for signal".
    const t = setInterval(() => offline && refresh(), 5000);
    return () => {
      alive.current = false;
      clearInterval(t);
    };
  }, [refresh, offline]);

  return { view, offline, refresh, setView };
}

export const shopLogIn = (code: string, password: string) => apiPost("/api/shop/login", { code, password });
export const setArea = (areaId: string, status: AreaStatus) => apiPost(`/api/areas/${areaId}/status`, { status });

export const requestActivation = (cardId: string) => apiPost(`/api/cards/${cardId}/activate-request`);
export const activationState = (cardId: string) =>
  apiGet<{ state: "waiting" | "approved" | "done" }>(`/api/cards/${cardId}/activation`);
export const setPin = (cardId: string, pin: string) => apiPost(`/api/cards/${cardId}/pins`, { pin });

export type RedeemResult =
  | { ok: true; payUsd: number; cardId: string; line: number; at: string; txHash: string }
  | { ok: false; reason: DeclineReason; limitUsd?: number };

/**
 * Redeems with up to three tries on a dropped connection. A retry can never pay twice:
 * the contract marks the line used before it pays, so a repeat comes back "code used".
 */
export async function redeem(input: {
  cardId: string;
  line: number;
  code: string;
  amountUsd: number;
  pin: string;
}): Promise<RedeemResult> {
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await apiPost<Extract<RedeemResult, { ok: true }>>("/api/redeem", input);
      return { ...r, ok: true };
    } catch (e) {
      const reason = (e instanceof ApiError ? e.reason : "no_signal") as DeclineReason;
      if (reason === "no_signal" && attempt < 2) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      // A retry after a lost reply can find its own payment: the line is then "used".
      const extra = e instanceof ApiError ? e.extra : {};
      return { ok: false, reason: KNOWN.has(reason) ? reason : "unavailable", limitUsd: extra.limitUsd as number };
    }
  }
}

const KNOWN = new Set<string>([
  "wrong_pin",
  "wrong_code",
  "code_used",
  "over_limit",
  "daily_count",
  "area_closed",
  "shop_cash",
  "no_signal",
  "not_enough",
  "unavailable",
  "too_many",
]);

export async function balance(cardId: string, pin: string) {
  try {
    const r = await apiPost<{ availableUsd: number }>("/api/balance", { cardId, pin });
    return { ok: true as const, availableUsd: r.availableUsd };
  } catch (e) {
    const reason = (e instanceof ApiError ? e.reason : "no_signal") as DeclineReason;
    return { ok: false as const, reason: KNOWN.has(reason) ? reason : ("unavailable" as DeclineReason) };
  }
}

export const sendReply = (cardId: string, choice: number) => apiPost("/api/messages", { cardId, choice });

// The pay-out form hands its fields to the PIN screen in memory, never in a URL.
type Pending = { cardId: string; line: number; code: string; amountUsd: number };
let pending: Pending | null = null;
export const setPending = (p: Pending | null) => {
  pending = p;
};
export const getPending = () => pending;
let lastResult: RedeemResult | null = null;
export const setLastResult = (r: RedeemResult | null) => {
  lastResult = r;
};
export const getLastResult = () => lastResult;
/** The last card this shop served, so the reply screen can prefill it. */
let lastCardId = "";
export const setLastCardId = (id: string) => {
  lastCardId = id;
};
export const getLastCardId = () => lastCardId;
