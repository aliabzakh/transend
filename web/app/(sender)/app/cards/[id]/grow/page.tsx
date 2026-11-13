"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowDownToLine, ExternalLink, Sprout, Timer, XCircle } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Row, Rows } from "@/components/ui/Row";
import { StatusLine } from "@/components/ui/StatusLine";
import { getSavings, moveBack, setAside, type SavingsView } from "@/lib/client/sender";
import { ApiError } from "@/lib/client/api";
import { explorerTxUrl } from "@/lib/config";
import { usd } from "@/lib/format";
import { yearlyYieldUsd } from "@/lib/savings/rules";
import { s } from "@/strings/sender.en";

/** "Grow": set part of a card's balance aside (staking) or move it back. Sender only. */
export default function GrowPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [view, setView] = useState<SavingsView | null>(null);
  const [mode, setMode] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tx, setTx] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setView(await getSavings(id));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) router.replace("/app/login");
      else setError(s.errors[e instanceof ApiError ? e.reason : "server_error"] ?? s.errors.server_error);
    }
  }, [id, router]);

  // Earned keeps growing, so refresh it every few seconds (faster with the demo clock).
  useEffect(() => {
    load();
    const t = setInterval(load, 8_000);
    return () => clearInterval(t);
  }, [load]);

  if (!view) {
    return (
      <Screen title={s.card.grow} back={{ href: `/app/cards/${id}`, label: s.back }}>
        {error ? <StatusLine icon={XCircle}>{error}</StatusLine> : <p className="muted">{s.loading}</p>}
      </Screen>
    );
  }

  const n = Number(amount);
  const valid = Number.isFinite(n) && n > 0;
  const pct = (view.apyBps / 100).toFixed(2);
  const stays = mode === "in" ? view.availableUsd - (valid ? n : 0) : view.availableUsd + (valid ? n : 0);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = mode === "in" ? await setAside(id, n) : await moveBack(id, n);
      setView(res);
      setTx(res.txHash);
      setAmount("");
    } catch (e) {
      const reason = e instanceof ApiError ? e.reason : "server_error";
      setError(s.grow.errors[reason] ?? s.errors[reason] ?? s.errors.server_error);
    }
    setBusy(false);
  };

  return (
    <Screen
      title={s.card.grow}
      back={{ href: `/app/cards/${id}`, label: s.back }}
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) submit();
      }}
      action={
        <Button type="submit" icon={mode === "in" ? Sprout : ArrowDownToLine} disabled={busy || !valid}>
          {mode === "in" ? s.grow.setAside : s.grow.moveBack}
        </Button>
      }
    >
      <p>{s.grow.lead}</p>
      <Rows>
        <Row label={s.grow.available} value={usd(view.availableUsd)} />
        <Row label={s.grow.growing} value={usd(view.setAsideUsd)} />
        <Row label={s.grow.earned} value={usd(view.earnedUsd)} />
      </Rows>
      <p className="muted small">
        {s.grow.rate(pct)}. {s.grow.rateNote}
      </p>
      {view.speedup !== 1 ? <StatusLine icon={Timer}>{s.grow.clock(view.speedup)}</StatusLine> : null}

      <div className="segmented" role="group" aria-label={s.card.grow}>
        <button type="button" className="seg" aria-pressed={mode === "in"} onClick={() => setMode("in")}>
          {s.grow.setAsideTab}
        </button>
        <button
          type="button"
          className="seg"
          aria-pressed={mode === "out"}
          onClick={() => setMode("out")}
          disabled={view.setAsideUsd <= 0}
        >
          {s.grow.moveBackTab}
        </button>
      </div>

      <Input
        label={s.grow.amount}
        inputMode="decimal"
        autoComplete="off"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        hint={
          mode === "in"
            ? s.grow.hintSetAside(view.minStakeUsd.toFixed(2), view.maxStakeNowUsd.toFixed(2))
            : s.grow.hintMoveBack(view.setAsideUsd.toFixed(2))
        }
      />
      {valid && mode === "in" ? <p>{s.grow.preview(yearlyYieldUsd(n, view.apyBps).toFixed(2))}</p> : null}
      {valid ? <p className="muted">{s.grow.staysAvailable(Math.max(0, stays).toFixed(2))}</p> : null}
      {error ? (
        <div className="notice">
          <StatusLine icon={XCircle}>{error}</StatusLine>
        </div>
      ) : null}
      {tx ? (
        <a className="nav-link" href={explorerTxUrl(tx)} target="_blank" rel="noreferrer">
          <ExternalLink className="icon" aria-hidden />
          <span>{s.receipt}</span>
        </a>
      ) : null}
    </Screen>
  );
}
