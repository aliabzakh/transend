import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "./env";

/** AES-256-GCM with KEY_ENCRYPTION_KEY (64 hex chars). Output: iv.tag.ciphertext, base64url. */
function key(): Buffer {
  const k = Buffer.from(env.keyEncryptionKey, "hex");
  if (k.length !== 32) throw new Error("KEY_ENCRYPTION_KEY must be 32 bytes of hex");
  return k;
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), body].map((b) => b.toString("base64url")).join(".");
}

export function decryptSecret(sealed: string): string {
  const [iv, tag, body] = sealed.split(".").map((p) => Buffer.from(p, "base64url"));
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(body), d.final()]).toString("utf8");
}
