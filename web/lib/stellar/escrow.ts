/**
 * Typed wrapper around the transend_escrow contract. Apps and API routes call
 * these functions; they never build transactions themselves. (A hand-written
 * binding: the contract surface is small and this avoids a generated package.)
 */
import { Address, Keypair, nativeToScVal, xdr } from "@stellar/stellar-sdk";
import { ContractError, invoke, read, type Submitted } from "./submit";
import { admin, fromUnits, toUnits, verifier } from "./network";

/** The contract's #[contracterror] enum, by number. */
export const ERRORS = {
  1: "NotFound",
  2: "AlreadyExists",
  3: "NotActive",
  4: "Frozen",
  5: "Paused",
  6: "BadLine",
  7: "CodeUsed",
  8: "BadCode",
  9: "OverWithdrawalLimit",
  10: "TooManyWithdrawals",
  11: "OverDailyLoad",
  12: "OverBalanceLimit",
  13: "InsufficientBalance",
  14: "TooManyCards",
  15: "TooManySenders",
  16: "BadInput",
  17: "NotAuthorized",
} as const;
export type EscrowErrorName = (typeof ERRORS)[keyof typeof ERRORS];

export function escrowErrorName(e: unknown): EscrowErrorName | null {
  return e instanceof ContractError ? (ERRORS[e.code as keyof typeof ERRORS] ?? null) : null;
}

const sym = (s: string) => nativeToScVal(s, { type: "symbol" });
const i128 = (n: bigint) => nativeToScVal(n, { type: "i128" });
const u32 = (n: number) => nativeToScVal(n, { type: "u32" });
const addr = (a: string) => new Address(a).toScVal();
const bytes = (b: Uint8Array) => xdr.ScVal.scvBytes(Buffer.from(b));

export type ChainCard = {
  sender: string;
  status: "Pending" | "Active" | "Frozen" | "Retired";
  balanceUsd: number;
  linesUsed: number;
  usedLines: number[]; // 1-based lines already spent
  withdrawalsToday: number;
  loadedTodayUsd: number;
  day: number;
};

type RawCard = {
  sender: string;
  status: string[] | string;
  balance: bigint;
  used: number;
  withdrawals_today: number;
  loaded_today: bigint;
  day: bigint;
};

function toCard(raw: RawCard): ChainCard {
  const status = (Array.isArray(raw.status) ? raw.status[0] : raw.status) as ChainCard["status"];
  const used: number[] = [];
  for (let i = 0; i < 20; i++) if (raw.used & (1 << i)) used.push(i + 1);
  return {
    sender: raw.sender,
    status,
    balanceUsd: fromUnits(BigInt(raw.balance)),
    linesUsed: used.length,
    usedLines: used,
    withdrawalsToday: raw.withdrawals_today,
    loadedTodayUsd: fromUnits(BigInt(raw.loaded_today)),
    day: Number(raw.day),
  };
}

// ---- reads ----

export async function getCard(cardId: string): Promise<ChainCard | null> {
  try {
    return toCard((await read("card", [sym(cardId)])) as RawCard);
  } catch (e) {
    if (escrowErrorName(e) === "NotFound") return null;
    throw e;
  }
}

export async function balanceUsd(cardId: string): Promise<number> {
  return fromUnits(BigInt((await read("balance", [sym(cardId)])) as bigint));
}

// ---- sender-signed ----

export const issueCard = (sender: Keypair, cardId: string, hashes: Uint8Array[], renewalHash: Uint8Array) =>
  invoke(sender, "issue_card", [
    addr(sender.publicKey()),
    sym(cardId),
    xdr.ScVal.scvVec(hashes.map(bytes)),
    bytes(renewalHash),
  ]);

export const activate = (sender: Keypair, cardId: string) => invoke(sender, "activate", [sym(cardId)]);

export const deposit = (from: Keypair, cardId: string, usd: number) =>
  invoke(from, "deposit", [sym(cardId), addr(from.publicKey()), i128(toUnits(usd))]);

export const freezeBySender = (sender: Keypair, cardId: string) =>
  invoke(sender, "freeze", [sym(cardId), addr(sender.publicKey())]);

export const unfreeze = (sender: Keypair, cardId: string) => invoke(sender, "unfreeze", [sym(cardId)]);

// ---- verifier-signed ----

/** `line` is the printed line, 1 to 20; the contract counts from 0. */
export const redeem = (cardId: string, line: number, code: string, usd: number, shop: string): Promise<Submitted> =>
  invoke(verifier(), "redeem", [
    sym(cardId),
    u32(line - 1),
    bytes(Buffer.from(code, "ascii")),
    i128(toUnits(usd)),
    addr(shop),
  ]);

export const freezeByVerifier = (cardId: string) =>
  invoke(verifier(), "freeze", [sym(cardId), addr(verifier().publicKey())]);
