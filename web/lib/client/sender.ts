"use client";
/**
 * Sender app data and actions. Screens use these hooks and functions only; they
 * never build a request or a transaction themselves.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { InboxItem, SenderView } from "@/lib/server/views";
import { ApiError, apiGet, apiPost, downloadPdf } from "./api";

export type { InboxItem, SenderCard, SenderRecipient, SenderView } from "@/lib/server/views";

/**
 * The signed-in sender's view-model. Sends the sender to log in (or to verify) when
 * needed. `pollMs` keeps it fresh, for example while waiting for a pickup.
 */
export function useMe(pollMs = 0, { needVerified = true } = {}) {
  const router = useRouter();
  const [me, setMe] = useState<SenderView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const { me } = await apiGet<{ me: SenderView }>("/api/me");
      if (!alive.current) return;
      if (needVerified && !me.verified) {
        router.replace("/app/verify");
        return;
      }
      setMe(me);
      setError(null);
    } catch (e) {
      if (!alive.current) return;
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/app/login");
        return;
      }
      setError(e instanceof ApiError ? e.reason : "server_error");
    }
  }, [router, needVerified]);

  useEffect(() => {
    alive.current = true;
    refresh();
    if (!pollMs) return () => void (alive.current = false);
    const t = setInterval(refresh, pollMs);
    return () => {
      alive.current = false;
      clearInterval(t);
    };
  }, [refresh, pollMs]);

  return { me, error, refresh };
}

export const signUp = (email: string, password: string) => apiPost("/api/auth/signup", { email, password });
export const logIn = (email: string, password: string) =>
  apiPost<{ verified: boolean }>("/api/auth/login", { email, password });
export const logOut = () => apiPost("/api/auth/logout?who=sender");
export const verifyIdentity = (name: string) => apiPost("/api/auth/verify", { name });

export const addRecipient = (input: { name: string; relationship: string; commune: string; department: string }) =>
  apiPost<{ recipientId: string }>("/api/recipients", input);

/** Makes the card and downloads its PDF. This is the only time the codes can be downloaded. */
export async function issueCard(recipientId: string): Promise<string> {
  const res = await downloadPdf("/api/cards", { recipientId }, "transend-card.pdf");
  return res.headers.get("x-card-id") ?? "";
}

type Tx = { txHash: string };
export const approveActivation = (cardId: string) => apiPost<Tx>(`/api/cards/${cardId}/approve`);
export const freezeCard = (cardId: string) => apiPost<Tx>(`/api/cards/${cardId}/freeze`);
export const unfreezeCard = (cardId: string) => apiPost<Tx>(`/api/cards/${cardId}/unfreeze`);

export type LiveQuote = {
  quoteId: string;
  cardId: string;
  amountCad: number;
  feeCad: number;
  rate: number;
  usdOut: number;
  allInPct: number;
  expiresAt: string;
};
export const getQuote = (cardId: string, amountCad: number) =>
  apiGet<LiveQuote>(`/api/quote?amount_cad=${encodeURIComponent(amountCad)}&card_id=${encodeURIComponent(cardId)}`);
export const send = (quoteId: string) =>
  apiPost<{ txHash: string; cardId: string; usdOut: number; amountCad: number }>("/api/send", { quoteId });

export type SavingsView = {
  cardId: string;
  status: string;
  availableUsd: number;
  setAsideUsd: number;
  totalUsd: number;
  earnedUsd: number;
  apyBps: number;
  speedup: number;
  stakingPaused: boolean;
  minStakeUsd: number;
  minLiquidUsd: number;
  maxStakeNowUsd: number;
};
export const getSavings = (cardId: string) => apiGet<SavingsView>(`/api/cards/${cardId}/savings`);
export const setAside = (cardId: string, amountUsd: number) =>
  apiPost<SavingsView & Tx>(`/api/cards/${cardId}/stake`, { amountUsd });
export const moveBack = (cardId: string, amountUsd: number) =>
  apiPost<SavingsView & Tx>(`/api/cards/${cardId}/unstake`, { amountUsd });

export const getInbox = () => apiGet<{ inbox: InboxItem[] }>("/api/inbox");
