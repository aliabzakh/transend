import { scValToNative, xdr } from "@stellar/stellar-sdk";

export type ContractEvent = {
  id: string;
  name: string;
  cardId: string;
  ledger: number;
  closedAt: string;
  txHash: string;
};

const RPC = process.env.SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";

async function rpc<T>(method: string, params?: unknown): Promise<T> {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const json = (await res.json()) as { result?: T; error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  return json.result as T;
}

type RawEvent = { id: string; ledger: number; ledgerClosedAt: string; txHash: string; topic: string[] };

const decode = (b64: string): string => {
  try {
    return String(scValToNative(xdr.ScVal.fromXDR(b64, "base64")));
  } catch {
    return "?";
  }
};

/** The oldest ledger the RPC still holds (getEvents refuses anything earlier). */
async function oldest(contractId: string): Promise<number | null> {
  try {
    const { sequence } = await rpc<{ sequence: number }>("getLatestLedger");
    const probe = await rpc<{ oldestLedger: number }>("getEvents", {
      startLedger: Math.max(1, sequence - 10),
      filters: [{ type: "contract", contractIds: [contractId] }],
      pagination: { limit: 1 },
    });
    return probe.oldestLedger;
  } catch {
    return null;
  }
}

/** Newest `limit` events for one contract, read straight from Soroban RPC. Read-only. */
export async function fetchRecentEvents(
  contractId: string,
  limit: number,
): Promise<{ events: ContractEvent[]; error?: string }> {
  try {
    // Public RPC keeps about a week of history but scans only ~10,000 ledgers per
    // call, returning a cursor. Page forward from the oldest retained ledger to now.
    type Page = { events: RawEvent[]; cursor?: string; latestLedger: number; oldestLedger: number };
    const filters = [{ type: "contract", contractIds: [contractId] }];
    let page = await rpc<Page>("getEvents", { startLedger: (await oldest(contractId)) ?? 1, filters, pagination: { limit: 200 } });
    const events: RawEvent[] = [...page.events];
    for (let i = 0; i < 25 && page.cursor; i++) {
      const at = Number(BigInt(page.cursor.split("-")[0]) >> 32n);
      if (at >= page.latestLedger) break;
      page = await rpc<Page>("getEvents", { filters, pagination: { cursor: page.cursor, limit: 200 } });
      events.push(...page.events);
    }
    const mapped = events
      // The USDC token also emits events for its own transfers; only show ones that carry a card ID.
      .filter((e) => e.topic.length >= 2)
      .map((e) => ({
        id: e.id,
        name: decode(e.topic[0]),
        cardId: decode(e.topic[1]),
        ledger: e.ledger,
        closedAt: e.ledgerClosedAt,
        txHash: e.txHash,
      }))
      .reverse();
    return { events: mapped.slice(0, limit) };
  } catch (e) {
    return { events: [], error: e instanceof Error ? e.message : String(e) };
  }
}
