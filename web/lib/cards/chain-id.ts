/**
 * Turns a printed card ID into the scrambled ID the escrow contract stores it under.
 * The ledger is public, so the printed ID never goes on it: without CARD_ID_SECRET
 * nobody can tell which on-chain card belongs to which physical card.
 *
 * Same printed ID in, same scrambled ID out, every time. Server only.
 * Code hashes for issue_card must be built with this scrambled ID, not the printed one.
 */
import { createHmac } from "node:crypto";

export function chainCardId(printedId: string): string {
  const secret = process.env.CARD_ID_SECRET;
  if (!secret) throw new Error("CARD_ID_SECRET is not set.");
  const hash = createHmac("sha256", secret).update(printedId).digest("hex");
  // Soroban Symbols allow up to 32 characters: "c" + 30 hex characters.
  return "c" + hash.slice(0, 30);
}
