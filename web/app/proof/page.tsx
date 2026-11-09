import { Screen } from "@/components/ui/Screen";
import { CONFIG } from "@/lib/config";
import { fetchRecentEvents } from "@/lib/stellar-read";

// Public, no login. Reads the live contract on every request.
export const dynamic = "force-dynamic";

const EXPLORER = "https://stellar.expert/explorer/testnet";

export default async function ProofPage() {
  const contractId = process.env.CONTRACT_ID || CONFIG.contractId;
  const usdcAsset = process.env.USDC_ASSET;
  const { events, error } = await fetchRecentEvents(contractId, 20);

  return (
    <Screen title="Proof for judges" back={{ href: "/", label: "Home" }}>
      <p>
        Everything below is live on the Stellar test network. No real money. You can check every step yourself.
      </p>

      <table className="table">
        <tbody>
          <tr>
            <th scope="row">Network</th>
            <td>Stellar testnet</td>
          </tr>
          <tr>
            <th scope="row">Contract ID</th>
            <td>
              <a href={`${EXPLORER}/contract/${contractId}`} target="_blank" rel="noreferrer" className="mono wrap">
                {contractId}
              </a>
            </td>
          </tr>
          {usdcAsset ? (
            <tr>
              <th scope="row">Demo USDC</th>
              <td className="mono wrap">
                {usdcAsset}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <h2 className="section-title">Last 20 contract events</h2>
      {error ? <p className="muted">Could not read events right now: {error}</p> : null}
      {!error && events.length === 0 ? (
        <p className="muted">No events yet. Send money and redeem a code to see them here.</p>
      ) : null}
      <ul className="list">
        {events.map((e) => (
          <li key={e.id} className="list-item">
            <span>
              <strong>{e.name}</strong> <span className="mono">{e.cardId}</span>
            </span>
            <span className="muted small">Ledger {e.ledger} · {e.closedAt}</span>
            <a href={`${EXPLORER}/tx/${e.txHash}`} target="_blank" rel="noreferrer">
              View transaction
            </a>
          </li>
        ))}
      </ul>
    </Screen>
  );
}
