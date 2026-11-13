/**
 * Rebuilds the whole on-chain side of the demo from an empty testnet:
 *   issuer -> demo USDC -> its Stellar Asset Contract -> transend_escrow
 *   -> yield reserve -> .env + README.
 *
 * Usage: npm run deploy:testnet
 *
 * Testnet only. Existing *_SECRET values in .env are reused; missing ones are
 * generated and funded with Friendbot. Nothing here is ever for real money.
 */
import "dotenv/config";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Address,
  Asset,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  rpc,
  xdr,
} from "@stellar/stellar-sdk";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_PATH = resolve(ROOT, ".env");
const WASM = resolve(ROOT, "target/wasm32v1-none/release/transend_escrow.wasm");

const RPC_URL = process.env.SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";
const PASSPHRASE = process.env.NETWORK_PASSPHRASE ?? Networks.TESTNET;
if (process.env.STELLAR_NETWORK && process.env.STELLAR_NETWORK !== "testnet") {
  throw new Error("deploy-testnet.ts only runs against testnet.");
}
const server = new rpc.Server(RPC_URL);

const USD = 10_000_000n; // USDC has 7 decimals on Stellar
// Hard caps from the PRD limits table. Admin can change them later with set_limits.
const LIMITS = {
  max_balance: 635n * USD,
  max_daily_load: 635n * USD,
  max_withdrawal: 100n * USD,
  max_withdrawals_per_day: 2,
  max_cards_per_sender: 3,
  max_senders_per_card: 2,
};
// Savings defaults from the PRD; admin can change them later.
const usdEnv = (k: string, d: number) => BigInt(Math.round(Number(process.env[k] ?? d) * 1e7));
const SAVINGS = {
  apy_bps: Number(process.env.DEMO_APY_BPS ?? 400),
  min_stake: usdEnv("MIN_STAKE_USD", 10),
  min_liquid: usdEnv("MIN_LIQUID_USD", 100),
  max_staked_total: usdEnv("MAX_STAKED_TOTAL_USD", 5000),
};
const YIELD_RESERVE = 1_000n * USD;

function log(msg: string) {
  console.log(msg);
}

function upsertEnv(values: Record<string, string>) {
  let text = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8") : "";
  for (const [k, v] of Object.entries(values)) {
    const line = `${k}=${v}`;
    const re = new RegExp(`^${k}=.*$`, "m");
    text = re.test(text) ? text.replace(re, line) : text + (text.endsWith("\n") || !text ? "" : "\n") + line + "\n";
  }
  writeFileSync(ENV_PATH, text, { mode: 0o600 });
}

function keypairFor(name: string): { kp: Keypair; created: boolean } {
  const existing = process.env[name];
  if (existing) return { kp: Keypair.fromSecret(existing), created: false };
  return { kp: Keypair.random(), created: true };
}

async function ensureFunded(kp: Keypair) {
  try {
    await server.getAccount(kp.publicKey());
  } catch {
    await server.requestAirdrop(kp.publicKey()); // Friendbot
    for (let i = 0; i < 20; i++) {
      try {
        await server.getAccount(kp.publicKey());
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    throw new Error(`Friendbot funding of ${kp.publicKey()} did not appear`);
  }
}

async function run(source: Keypair, op: xdr.Operation, label: string): Promise<xdr.ScVal | undefined> {
  const account = await server.getAccount(source.publicKey());
  let tx = new TransactionBuilder(account, { fee: "100", networkPassphrase: PASSPHRASE })
    .addOperation(op)
    .setTimeout(60)
    .build();
  tx = await server.prepareTransaction(tx);
  tx.sign(source);
  const sent = await server.sendTransaction(tx);
  if (sent.status === "ERROR") throw new Error(`${label}: send failed ${JSON.stringify(sent.errorResult)}`);
  for (let i = 0; i < 60; i++) {
    const res = await server.getTransaction(sent.hash);
    if (res.status === "SUCCESS") {
      log(`  ok  ${label}  https://stellar.expert/explorer/testnet/tx/${sent.hash}`);
      return res.returnValue;
    }
    if (res.status === "FAILED") throw new Error(`${label}: transaction failed (${sent.hash})`);
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`${label}: timed out (${sent.hash})`);
}

/** Struct keys must be sorted for a Soroban #[contracttype] struct. */
function structScVal(obj: Record<string, bigint | number>): xdr.ScVal {
  const entries = Object.entries(obj).sort(([a], [b]) => (a < b ? -1 : 1));
  return xdr.ScVal.scvMap(
    entries.map(([k, v]) =>
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol(k),
        val: typeof v === "bigint" ? nativeToScVal(v, { type: "i128" }) : nativeToScVal(v, { type: "u32" }),
      }),
    ),
  );
}

async function main() {
  // Always rebuild, so a stale wasm from an older contract version is never deployed.
  log("Building contract...");
  execSync("stellar contract build", { cwd: ROOT, stdio: "inherit" });
  if (!existsSync(WASM)) throw new Error(`build produced no wasm at ${WASM}`);

  const issuer = keypairFor("ISSUER_SECRET");
  const admin = keypairFor("ADMIN_SECRET");
  const verifier = keypairFor("VERIFIER_SECRET");
  const sponsor = keypairFor("SPONSOR_SECRET");

  log("Funding accounts with Friendbot (testnet)...");
  for (const k of [issuer, admin, verifier, sponsor]) await ensureFunded(k.kp);

  // 1. Demo USDC, issued by our own account so we never depend on an outside faucet.
  const usdc = new Asset("USDC", issuer.kp.publicKey());
  const usdcContractId = usdc.contractId(PASSPHRASE);
  log(`Demo USDC: ${usdc.getCode()}:${usdc.getIssuer()}`);
  try {
    await run(issuer.kp, Operation.createStellarAssetContract({ asset: usdc }), "deploy USDC Stellar Asset Contract");
  } catch (e) {
    // Already deployed on a previous run: the contract ID is deterministic, so carry on.
    log(`  (USDC contract already exists: ${usdcContractId})`);
  }

  // 2. The escrow contract.
  log("Uploading and deploying transend_escrow...");
  const wasm = readFileSync(WASM);
  const uploaded = await run(issuer.kp, Operation.uploadContractWasm({ wasm }), "upload wasm");
  const wasmHash = uploaded ? Buffer.from(scValToNative(uploaded) as Uint8Array) : undefined;
  if (!wasmHash) throw new Error("upload returned no wasm hash");

  const created = await run(
    admin.kp,
    Operation.createCustomContract({
      address: new Address(admin.kp.publicKey()),
      wasmHash,
      salt: Keypair.random().rawPublicKey(), // fresh contract every run
      constructorArgs: [
        new Address(admin.kp.publicKey()).toScVal(),
        new Address(usdcContractId).toScVal(),
        new Address(verifier.kp.publicKey()).toScVal(),
        structScVal(LIMITS),
        structScVal(SAVINGS),
      ],
    }),
    "deploy transend_escrow",
  );
  if (!created) throw new Error("create returned no contract address");
  const contractId = Address.fromScVal(created).toString();

  // 3. Yield reserve for Savings: the admin gets demo USDC and funds the contract with it.
  log("Funding the Savings yield reserve...");
  try {
    await run(admin.kp, Operation.changeTrust({ asset: usdc }), "admin USDC trustline");
  } catch {
    log("  (admin trustline already exists)");
  }
  await run(
    issuer.kp,
    Operation.payment({ destination: admin.kp.publicKey(), asset: usdc, amount: (Number(YIELD_RESERVE) / 1e7).toFixed(7) }),
    "issue demo USDC to admin",
  );
  await run(
    admin.kp,
    Operation.invokeContractFunction({
      contract: contractId,
      function: "fund_yield_reserve",
      args: [nativeToScVal(YIELD_RESERVE, { type: "i128" })],
    }),
    "fund_yield_reserve",
  );
  const speedup = Number(process.env.DEMO_YIELD_SPEEDUP ?? 1);
  if (speedup !== 1) {
    await run(
      admin.kp,
      Operation.invokeContractFunction({
        contract: contractId,
        function: "set_speedup",
        args: [nativeToScVal(speedup, { type: "u32" })],
      }),
      `set_speedup(${speedup})`,
    );
  }

  // 4. Persist. Secrets only ever go to .env (gitignored, mode 600).
  const values: Record<string, string> = {
    STELLAR_NETWORK: "testnet",
    SOROBAN_RPC_URL: RPC_URL,
    HORIZON_URL: process.env.HORIZON_URL ?? "https://horizon-testnet.stellar.org",
    NETWORK_PASSPHRASE: PASSPHRASE,
    CONTRACT_ID: contractId,
    USDC_ASSET: `${usdc.getCode()}:${usdc.getIssuer()}`,
    USDC_CONTRACT_ID: usdcContractId,
    ISSUER_SECRET: issuer.kp.secret(),
    ADMIN_SECRET: admin.kp.secret(),
    VERIFIER_SECRET: verifier.kp.secret(),
    SPONSOR_SECRET: sponsor.kp.secret(),
  };
  upsertEnv(values);

  // Non-secret IDs for judges and the README.
  mkdirSync(resolve(ROOT, "docs"), { recursive: true });
  writeFileSync(
    resolve(ROOT, "docs/deployment.json"),
    JSON.stringify(
      {
        network: "testnet",
        contractId,
        usdcAsset: values.USDC_ASSET,
        usdcContractId,
        admin: admin.kp.publicKey(),
        verifier: verifier.kp.publicKey(),
        sponsor: sponsor.kp.publicKey(),
        contractUrl: `https://stellar.expert/explorer/testnet/contract/${contractId}`,
        deployedAt: new Date().toISOString(),
      },
      null,
      2,
    ) + "\n",
  );

  const readme = resolve(ROOT, "README.md");
  if (existsSync(readme)) {
    const text = readFileSync(readme, "utf8");
    const block = `<!-- CONTRACT_ID -->\n**Contract ID (testnet):** [\`${contractId}\`](https://stellar.expert/explorer/testnet/contract/${contractId})\n<!-- /CONTRACT_ID -->`;
    if (text.includes("<!-- CONTRACT_ID -->")) {
      writeFileSync(readme, text.replace(/<!-- CONTRACT_ID -->[\s\S]*?<!-- \/CONTRACT_ID -->/, block));
    }
  }

  log("\nDone.");
  log(`  Contract ID : ${contractId}`);
  log(`  Explorer    : https://stellar.expert/explorer/testnet/contract/${contractId}`);
  log(`  Secrets and IDs written to .env (not committed).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
