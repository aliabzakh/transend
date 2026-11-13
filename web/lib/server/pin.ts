import { randomBytes, timingSafeEqual } from "node:crypto";
import { argon2id } from "hash-wasm";
import { env } from "./env";

/**
 * argon2id(PIN, per-card salt, server pepper). The PIN is never stored, logged or
 * put on-chain; only this hash is kept. The pepper lives only in the environment.
 */
const PARAMS = { parallelism: 1, iterations: 3, memorySize: 19_456, hashLength: 32 } as const;

export const isPin = (pin: unknown): pin is string => typeof pin === "string" && /^\d{4}$/.test(pin);

async function derive(pin: string, salt: Buffer): Promise<Buffer> {
  const hex = await argon2id({
    password: pin + env.pinPepper,
    salt,
    ...PARAMS,
    outputType: "hex",
  });
  return Buffer.from(hex, "hex");
}

export async function hashPin(pin: string): Promise<{ hash: string; salt: string }> {
  const salt = randomBytes(16);
  const hash = await derive(pin, salt);
  return { hash: hash.toString("base64"), salt: salt.toString("base64") };
}

export async function verifyPin(pin: string, hash: string, salt: string): Promise<boolean> {
  const got = await derive(pin, Buffer.from(salt, "base64"));
  const want = Buffer.from(hash, "base64");
  return got.length === want.length && timingSafeEqual(got, want);
}
