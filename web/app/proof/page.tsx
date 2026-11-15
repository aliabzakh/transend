import { ExternalLink, Network } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Logo } from "@/components/ui/Logo";
import { CONFIG, explorerContractUrl, explorerTxUrl } from "@/lib/config";
import { fetchRecentEvents } from "@/lib/stellar/read";

// Public, no login. Reads the live contract on every request.
// This is the only page that may use crypto words.
export const dynamic = "force-dynamic";

export default async function ProofPage() {
  const contractId = process.env.CONTRACT_ID || CONFIG.contractId;
  const usdcAsset = process.env.USDC_ASSET;
  const { events, error } = await fetchRecentEvents(contractId, 20);

  return (
    <div className="app-root">
      <header className="app-header app-header-wide">
        <Logo />
        <span className="pill">
          <Network className="icon" aria-hidden />
          Stellar testnet
        </span>
      </header>
      <Screen title="Proof for judges" back={{ href: "/", label: "Home" }} wide>
        <p className="muted">
          Everything below is live on the Stellar test network. No real money. You can check every step yourself.
        </p>

        <div className="rows rows-stack">
          <div className="row">
            <span className="row-label">Network</span>
            <span className="row-value">Stellar testnet</span>
          </div>
          <div className="row">
            <span className="row-label">Contract ID</span>
            <a href={explorerContractUrl(contractId)} target="_blank" rel="noreferrer" className="row-value mono wrap">
              {contractId}
            </a>
          </div>
          {usdcAsset ? (
            <div className="row">
              <span className="row-label">Demo USDC</span>
              <span className="row-value mono wrap">{usdcAsset}</span>
            </div>
          ) : null}
        </div>

        <h2 className="section-title">Last 20 contract events</h2>
        {error ? <p className="muted">Could not read events right now: {error}</p> : null}
        {!error && events.length === 0 ? (
          <p className="muted">No events yet. Send money and redeem a code to see them here.</p>
        ) : null}
        {events.length ? (
          <ul className="list list-card">
            {events.map((e) => (
              <li key={e.id} className="list-item">
                <div className="spread">
                  <span className="wrap">
                    <span className="pill">{e.name}</span> <span className="mono wrap">{e.cardId}</span>
                  </span>
                  <a className="ext-link" href={explorerTxUrl(e.txHash)} target="_blank" rel="noreferrer">
                    <ExternalLink className="icon" aria-hidden />
                    <span>View transaction</span>
                  </a>
                </div>
                <span className="helper">
                  Ledger {e.ledger} · {e.closedAt}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </Screen>
    </div>
  );
}
