import { Asset, Keypair, rpc } from "@stellar/stellar-sdk";
import { env } from "../server/env";

let _server: rpc.Server | undefined;
export const server = () => (_server ??= new rpc.Server(env.rpcUrl));

export const sponsor = () => Keypair.fromSecret(env.sponsorSecret);
export const verifier = () => Keypair.fromSecret(env.verifierSecret);
export const admin = () => Keypair.fromSecret(env.adminSecret);
export const issuer = () => Keypair.fromSecret(env.issuerSecret);

export function usdcAsset(): Asset {
  const [code, iss] = env.usdcAsset.split(":");
  return new Asset(code, iss);
}

/** USDC on Stellar has 7 decimals. Amounts cross the API in US$ with two decimals. */
export const USDC_UNIT = 10_000_000n;
export const toUnits = (usd: number): bigint => BigInt(Math.round(usd * 100)) * (USDC_UNIT / 100n);
export const fromUnits = (units: bigint): number => Number(units) / Number(USDC_UNIT);
