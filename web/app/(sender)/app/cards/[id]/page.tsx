"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { BellRing, CheckCircle2, Clock, ExternalLink, Pause, Play, Sprout, XCircle } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { Row, Rows } from "@/components/ui/Row";
import { StatusLine } from "@/components/ui/StatusLine";
import { approveActivation, freezeCard, unfreezeCard, useMe } from "@/lib/client/sender";
import { ApiError } from "@/lib/client/api";
import { CONFIG, explorerTxUrl } from "@/lib/config";
import { usd } from "@/lib/format";
import { s } from "@/strings/sender.en";

export default function CardPage() {
  const { id } = useParams<{ id: string }>();
  // Poll while the card waits for a shop, so the approval prompt appears on its own.
  const { me, refresh } = useMe(5_000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tx, setTx] = useState<string | null>(null);

  if (!me) {
    return (
      <Screen title="Card" back={{ href: "/app", label: s.back }}>
        <p className="muted">{s.loading}</p>
      </Screen>
    );
  }
  const r = me.recipients.find((x) => x.card?.id === id);
  const card = r?.card;
  if (!card || !r) {
    return (
      <Screen title="Card" back={{ href: "/app", label: s.back }}>
        <p>{s.errors.not_found}</p>
      </Screen>
    );
  }

  const run = (fn: (id: string) => Promise<{ txHash: string }>) => async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fn(card.id);
      setTx(res.txHash);
      await refresh();
    } catch (e) {
      const reason = e instanceof ApiError ? e.reason : "server_error";
      setError(s.errors[reason] ?? s.errors.server_error);
    }
    setBusy(false);
  };

  const statusIcon = card.status === "Active" ? CheckCircle2 : card.status === "Frozen" ? Pause : Clock;

  let action = null;
  if (card.activationRequested) {
    action = (
      <Button icon={CheckCircle2} onClick={run(approveActivation)} disabled={busy}>
        {s.card.approve}
      </Button>
    );
  } else if (card.status === "Active") {
    action = (
      <>
        <Button href={`/app/cards/${card.id}/grow`} icon={Sprout}>
          {s.card.grow}
        </Button>
        <Button variant="secondary" icon={Pause} onClick={run(freezeCard)} disabled={busy}>
          {s.card.freeze}
        </Button>
      </>
    );
  } else if (card.status === "Frozen") {
    action = (
      <Button icon={Play} onClick={run(unfreezeCard)} disabled={busy}>
        {s.card.unfreeze}
      </Button>
    );
  }

  return (
    <Screen title={s.card.title(r.name)} back={{ href: "/app", label: s.back }} action={action}>
      {card.activationRequested ? (
        <div className="notice">
          <StatusLine icon={BellRing}>{s.card.approveLead(r.name)}</StatusLine>
          {card.activationShop ? <p className="muted">{s.card.askedBy(card.activationShop)}</p> : null}
        </div>
      ) : null}
      {card.status === "Pending" && !card.activationRequested ? <p className="muted">{s.card.waiting}</p> : null}
      {error ? <StatusLine icon={XCircle}>{error}</StatusLine> : null}

      <StatusLine icon={statusIcon}>{s.card.statusText[card.status]}</StatusLine>
      <Rows>
        <Row label={s.card.id} value={<span className="mono">{card.id}</span>} />
        <Row label={s.card.lines} value={s.card.linesValue(card.linesUsed, CONFIG.linesPerCard)} />
        <Row label={s.card.available} value={usd(card.availableUsd)} />
        <Row label={s.card.growing} value={usd(card.setAsideUsd)} />
        <Row label={s.card.earned} value={usd(card.earnedUsd)} />
      </Rows>

      {tx ? (
        <a className="nav-link" href={explorerTxUrl(tx)} target="_blank" rel="noreferrer">
          <ExternalLink className="icon" aria-hidden />
          <span>{s.receipt}</span>
        </a>
      ) : null}
      <p className="muted small">{s.card.downloadedOnce}</p>
    </Screen>
  );
}
