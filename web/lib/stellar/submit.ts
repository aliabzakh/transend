/**
 * The only place that builds, signs and submits transactions. Every transaction
 * is fee-bumped by the sponsor, so senders, shops, the verifier and cards never
 * spend XLM on fees.
 */
import {
  Account,
  BASE_FEE,
  Contract,
  FeeBumpTransaction,
  Keypair,
  Operation,
  Transaction,
  TransactionBuilder,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { env } from "../server/env";
import { server, sponsor } from "./network";

/** A contract error from transend_escrow, decoded from `Error(Contract, #n)`. */
export class ContractError extends Error {
  constructor(
    public code: number,
    message: string,
  ) {
    super(message);
  }
}

export class ChainError extends Error {}

export type Submitted = { hash: string; returnValue?: unknown };

const FEE_BUMP_BASE = "1000"; // stroops per op; the resource fee is added on top

function contractErrorFrom(e: unknown): ContractError | null {
  const text = e instanceof Error ? e.message : typeof e === "string" ? e : JSON.stringify(e);
  const m = /Error\(Contract, #(\d+)\)/.exec(text);
  return m ? new ContractError(Number(m[1]), text) : null;
}

async function waitFor(hash: string): Promise<rpc.Api.GetSuccessfulTransactionResponse> {
  for (let i = 0; i < 40; i++) {
    const res = await server().getTransaction(hash);
    if (res.status === rpc.Api.GetTransactionStatus.SUCCESS) return res;
    if (res.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new ChainError(`transaction failed: ${hash}`);
    }
    await new Promise((r) => setTimeout(r, 750));
  }
  throw new ChainError(`timed out waiting for ${hash}`);
}

async function send(tx: Transaction | FeeBumpTransaction): Promise<Submitted> {
  const sent = await server().sendTransaction(tx);
  if (sent.status === "ERROR" || sent.status === "TRY_AGAIN_LATER") {
    const code = sent.errorResult?.result.type ?? sent.status;
    throw new ChainError(`send failed: ${code}`);
  }
  const done = await waitFor(sent.hash);
  return { hash: sent.hash, returnValue: done.returnValue ? scValToNative(done.returnValue) : undefined };
}

function feeBump(inner: Transaction): FeeBumpTransaction {
  const bump = TransactionBuilder.buildFeeBumpTransaction(sponsor(), FEE_BUMP_BASE, inner, env.passphrase);
  bump.sign(sponsor());
  return bump;
}

/**
 * Calls a method on transend_escrow (or another contract) as `signer`. The signer is
 * the inner source, so its `require_auth` is met by the source-account signature.
 * Simulation runs first: a contract error comes back as ContractError and nothing
 * is submitted.
 */
export async function invoke(
  signer: Keypair,
  method: string,
  args: xdr.ScVal[],
  contractId = env.contractId,
): Promise<Submitted> {
  for (let attempt = 0; ; attempt++) {
    const account = await server().getAccount(signer.publicKey());
    const built = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: env.passphrase })
      .addOperation(new Contract(contractId).call(method, ...args))
      .setTimeout(60)
      .build();
    let prepared: Transaction;
    try {
      prepared = await server().prepareTransaction(built);
    } catch (e) {
      throw contractErrorFrom(e) ?? new ChainError(e instanceof Error ? e.message : String(e));
    }
    prepared.sign(signer);
    try {
      return await send(feeBump(prepared));
    } catch (e) {
      // Two calls from one account at once can collide on the sequence number: retry once.
      if (attempt === 0 && e instanceof ChainError && /txBadSeq|tx_bad_seq/i.test(e.message)) continue;
      throw e;
    }
  }
}

/** Read-only call: simulate only, never submitted, no signature needed. */
export async function read(method: string, args: xdr.ScVal[], contractId = env.contractId): Promise<unknown> {
  const source = new Account(sponsor().publicKey(), "0");
  const tx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: env.passphrase })
    .addOperation(new Contract(contractId).call(method, ...args))
    .setTimeout(30)
    .build();
  const sim = await server().simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw contractErrorFrom(sim.error) ?? new ChainError(sim.error);
  }
  const retval = (sim as rpc.Api.SimulateTransactionSuccessResponse).result?.retval;
  return retval ? scValToNative(retval) : undefined;
}

/** Classic operations (payments, trustlines), built with `source`, fee-bumped by the sponsor. */
export async function classic(
  source: Keypair,
  ops: xdr.Operation[],
  extraSigners: Keypair[] = [],
): Promise<Submitted> {
  const account = await server().getAccount(source.publicKey());
  let b = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: env.passphrase }).setTimeout(60);
  for (const op of ops) b = b.addOperation(op);
  const tx = b.build();
  tx.sign(source, ...extraSigners);
  // The sponsor is the source of account-creation transactions and pays its own fee.
  if (source.publicKey() === sponsor().publicKey()) return send(tx);
  return send(feeBump(tx));
}

export { Operation };
