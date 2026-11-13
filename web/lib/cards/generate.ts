/**
 * Server only. Makes a card's 20 one-time codes and its renewal code. The plain
 * codes go into the printed PDF and nowhere else: the caller stores only the
 * hashes, on-chain.
 */
import { createHash, randomBytes } from "node:crypto";
import { CROCKFORD } from "./format";

export const LINES = 20;

/** 12 Crockford base32 characters = 60 random bits. */
export function randomCode(): string {
  const b = randomBytes(8);
  let n = b.readBigUInt64BE() >> 4n; // 60 bits
  let out = "";
  for (let i = 0; i < 12; i++) {
    out = CROCKFORD[Number(n & 31n)] + out;
    n >>= 5n;
  }
  return out;
}

/** sha256(card_id || line as u32 big-endian || code). Line counts from 0; the renewal code is line 20. */
export function codeHash(cardId: string, line: number, code: string): Buffer {
  const lineBytes = Buffer.alloc(4);
  lineBytes.writeUInt32BE(line);
  return createHash("sha256")
    .update(Buffer.from(cardId, "ascii"))
    .update(lineBytes)
    .update(Buffer.from(code, "ascii"))
    .digest();
}

export type CardSecrets = { cardId: string; codes: string[]; renewalCode: string };

export function generateCard(cardId: string): CardSecrets & { hashes: Buffer[]; renewalHash: Buffer } {
  const codes = Array.from({ length: LINES }, randomCode);
  const renewalCode = randomCode();
  return {
    cardId,
    codes,
    renewalCode,
    hashes: codes.map((c, i) => codeHash(cardId, i, c)),
    renewalHash: codeHash(cardId, LINES, renewalCode),
  };
}
