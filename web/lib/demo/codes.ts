/**
 * Demo-only one-time codes. In stage 2 the server generates real random codes and
 * keeps only their hashes. Here a code is derived from the card ID and line so that
 * the printed demo card and the shop screens agree without a server.
 */
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function fnv(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** line is 1 to 20. Returns 12 Crockford base32 characters. */
export function demoCode(cardId: string, line: number): string {
  let out = "";
  let h = fnv(`${cardId}:${line}`);
  for (let i = 0; i < 12; i++) {
    h = fnv(`${h}:${i}:${cardId}`);
    out += CROCKFORD[h % 32];
  }
  return out;
}

export const groupCode = (c: string) => c.match(/.{1,4}/g)?.join(" ") ?? c;

export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

const ID_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

export function newCardId(): string {
  const buf = new Uint32Array(6);
  crypto.getRandomValues(buf);
  return "TS" + Array.from(buf, (n) => ID_ALPHABET[n % ID_ALPHABET.length]).join("");
}

/** Stable demo card IDs, so the admin preview and its print sheet agree. */
export function demoCardIds(n: number): string[] {
  const ids = ["TS4F2K9Q"];
  for (let i = 1; ids.length < n; i++) {
    let h = fnv(`demo-card:${i}`);
    let id = "TS";
    for (let k = 0; k < 6; k++) {
      h = fnv(`${h}:${k}`);
      id += ID_ALPHABET[h % ID_ALPHABET.length];
    }
    ids.push(id);
  }
  return ids.slice(0, n);
}

export const isCardId = (s: string) => /^TS[0-9A-Z]{6}$/.test(s.trim().toUpperCase());
