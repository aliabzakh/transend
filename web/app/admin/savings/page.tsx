"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Row, Rows } from "@/components/ui/Row";
import { StatusLine } from "@/components/ui/StatusLine";
import { apiGet, apiPost } from "@/lib/client/api";
import { explorerTxUrl } from "@/lib/config";
import { usd } from "@/lib/format";

type Savings = {
  apyBps: number;
  minStakeUsd: number;
  minLiquidUsd: number;
  maxStakedTotalUsd: number;
  stakedTotalUsd: number;
  yieldReserveUsd: number;
  speedup: number;
  stakingPaused: boolean;
};

/** Savings controls: demo rate, yield reserve, kill switch and the demo clock. Each is an on-chain admin call. */
export default function AdminSavingsPage() {
  const [sv, setSv] = useState<Savings | null>(null);
  const [apy, setApy] = useState("");
  const [fund, setFund] = useState("100");
  const [clock, setClock] = useState("");
  const [busy, setBusy] = useState(false);
  const [tx, setTx] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ savings: Savings }>("/admin/api/savings")
      .then((r) => {
        setSv(r.savings);
        setApy(String(r.savings.apyBps));
        setClock(String(r.savings.speedup));
      })
      .catch(() => setError("Could not read the contract."));
  }, []);

  const act = (action: string, value?: number) => async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await apiPost<{ txHash: string; savings: Savings }>("/admin/api/savings", { action, value });
      setSv(r.savings);
      setTx(r.txHash);
    } catch {
      setError("That did not work. Check the value and try again.");
    }
    setBusy(false);
  };

  return (
    <Screen title="Savings">
      <p>Demo rate only, never a real return. The yield reserve is demo USDC the admin funds into the contract.</p>
      {sv ? (
        <Rows>
          <Row label="Demo rate" value={`${(sv.apyBps / 100).toFixed(2)}% a year`} />
          <Row label="Set aside, all cards" value={usd(sv.stakedTotalUsd)} />
          <Row label="Total cap" value={usd(sv.maxStakedTotalUsd)} />
          <Row label="Yield reserve" value={usd(sv.yieldReserveUsd)} />
          <Row label="Demo clock" value={sv.speedup === 1 ? "x1 (normal)" : `x${sv.speedup}`} />
          <Row label="Setting aside" value={sv.stakingPaused ? "Paused" : "Open"} />
        </Rows>
      ) : null}

      <section className="stack">
        <h2 className="section-title">Demo rate (basis points; 400 = 4.00%)</h2>
        <Input label="Rate in bps" inputMode="numeric" value={apy} onChange={(e) => setApy(e.target.value)} />
        <Button variant="secondary" disabled={busy} onClick={act("set_apy", Number(apy))}>
          Set rate
        </Button>
      </section>
      <section className="stack">
        <h2 className="section-title">Fund the yield reserve (US$)</h2>
        <Input label="Amount in US$" inputMode="decimal" value={fund} onChange={(e) => setFund(e.target.value)} />
        <Button variant="secondary" disabled={busy} onClick={act("fund", Number(fund))}>
          Fund reserve
        </Button>
      </section>
      <section className="stack">
        <h2 className="section-title">Demo clock (for the video only)</h2>
        <Input label="Speed-up (1 = normal)" inputMode="numeric" value={clock} onChange={(e) => setClock(e.target.value)} />
        <Button variant="secondary" disabled={busy} onClick={act("speedup", Number(clock))}>
          Set demo clock
        </Button>
      </section>
      <section className="stack">
        <h2 className="section-title">Kill switch</h2>
        <Button variant="secondary" disabled={busy || !sv} onClick={act(sv?.stakingPaused ? "unpause" : "pause")}>
          {sv?.stakingPaused ? "Reopen setting aside" : "Pause setting aside"}
        </Button>
        <p className="muted small">Moving money back always works, even while paused.</p>
      </section>

      {busy ? <p className="muted">Sending to testnet...</p> : null}
      {error ? <StatusLine icon={XCircle}>{error}</StatusLine> : null}
      {tx && !busy ? (
        <>
          <StatusLine icon={CheckCircle2}>Done.</StatusLine>
          <a className="nav-link" href={explorerTxUrl(tx)} target="_blank" rel="noreferrer">
            <ExternalLink className="icon" aria-hidden />
            <span>View transaction</span>
          </a>
        </>
      ) : null}
    </Screen>
  );
}
