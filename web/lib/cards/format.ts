/** Card ID and code formatting. Safe in the browser: no secrets here. */
export const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const ID_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

export const groupCode = (c: string) => c.match(/.{1,4}/g)?.join(" ") ?? c;

/** Upper-case, drop spaces and dashes, and read Crockford look-alikes (I, L -> 1; O -> 0). */
export function normalizeCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0");
}

export const isCardId = (s: string) => /^TS[0-9A-Z]{6}$/.test(s.trim().toUpperCase());
export const isCode = (s: string) => new RegExp(`^[${CROCKFORD}]{12}$`).test(s);

export function randomCardId(): string {
  const buf = new Uint32Array(6);
  crypto.getRandomValues(buf);
  return "TS" + Array.from(buf, (n) => ID_ALPHABET[n % ID_ALPHABET.length]).join("");
}
