import { Screen } from "@/components/ui/Screen";
import { CONFIG } from "@/lib/config";
import { fetchRecentEvents } from "@/lib/stellar-read";
import { getSavings, type ChainSavings } from "@/lib/stellar/escrow";

// Public, no login. Reads the live contract on every request.
export const dynamic = "force-dynamic";

const EXPLORER = "https://stellar.expert/explorer/testnet";

export default async function ProofPage() {
  const contractId = process.env.CONTRACT_ID || CONFIG.contractId;
  const usdcAsset = process.env.USDC_ASSET;
  const [{ events, error }, savings] = await Promise.all([
    fetchRecentEvents(contractId, 20),
    getSavings().catch((): ChainSavings | null => null),
  ]);

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

      <h2 className="section-title">Savings (staking for yield)</h2>
      {savings ? (
        <table className="table">
          <tbody>
            <tr>
              <th scope="row">Total set aside (staked)</th>
              <td className="num">US${savings.stakedTotalUsd.toFixed(2)}</td>
            </tr>
            <tr>
              <th scope="row">Yield reserve</th>
              <td className="num">US${savings.yieldReserveUsd.toFixed(2)}</td>
            </tr>
            <tr>
              <th scope="row">Demo rate</th>
              <td className="num">{(savings.apyBps / 100).toFixed(2)}% a year, not guaranteed</td>
            </tr>
            {savings.speedup !== 1 ? (
              <tr>
                <th scope="row">Yield clock</th>
                <td className="num">x{savings.speedup} (sped up for the demo video)</td>
              </tr>
            ) : null}
            <tr>
              <th scope="row">Staking</th>
              <td>{savings.stakingPaused ? "Paused" : "Open"}</td>
            </tr>
          </tbody>
        </table>
      ) : (
        <p className="muted">Could not read the Savings state right now.</p>
      )}
      <p className="muted small">
        The vault is a mock: set-aside USDC stays in the escrow, and yield is paid only from the admin-funded reserve.
      </p>

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
