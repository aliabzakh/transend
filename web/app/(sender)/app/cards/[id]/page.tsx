"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { BellRing, CheckCircle2, Clock, ExternalLink, Pause, Play, XCircle } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Meter } from "@/components/ui/Meter";
import { Row, Rows } from "@/components/ui/Row";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusLine } from "@/components/ui/StatusLine";
import { approveActivation, freezeCard, unfreezeCard, useMe } from "@/lib/client/sender";
import { ApiError } from "@/lib/client/api";
import { CONFIG, explorerTxUrl } from "@/lib/config";
import { s } from "@/strings/sender.en";

const STATUS_PILL = { Pending: "pill-wait", Active: "pill-ok", Frozen: "pill-warn", Retired: "pill-muted" } as const;

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
        <Skeleton label={s.loading} />
        <Skeleton kind="tall" />
      </Screen>
    );
  }
  const r = me.recipients.find((x) => x.card?.id === id);
  const card = r?.card;
  if (!card || !r) {
    return (
      <Screen title="Card" back={{ href: "/app", label: s.back }}>
        <div className="notice notice-error">
          <StatusLine icon={XCircle}>{s.errors.not_found}</StatusLine>
        </div>
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

  let action = null;
  if (card.activationRequested) {
    action = (
      <Button icon={CheckCircle2} onClick={run(approveActivation)} busy={busy}>
        {s.card.approve}
      </Button>
    );
  } else if (card.status === "Active") {
    action = (
      <Button variant="danger" icon={Pause} onClick={run(freezeCard)} busy={busy}>
        {s.card.freeze}
      </Button>
    );
  } else if (card.status === "Frozen") {
    action = (
      <Button icon={Play} onClick={run(unfreezeCard)} busy={busy}>
        {s.card.unfreeze}
      </Button>
    );
  }

  return (
    <Screen title={s.card.title(r.name)} back={{ href: "/app", label: s.back }} action={action}>
      {card.activationRequested ? (
        <div className="notice">
          <StatusLine icon={BellRing}>{s.card.approveLead(r.name)}</StatusLine>
          {card.activationShop ? <p className="muted small">{s.card.askedBy(card.activationShop)}</p> : null}
        </div>
      ) : null}
      {error ? (
        <div className="notice notice-error">
          <StatusLine icon={XCircle}>{error}</StatusLine>
        </div>
      ) : null}

      <Card>
        <div className="inline">
          <Avatar name={r.name} />
          <div className="card-grow">
            <p className="card-name">{r.name}</p>
            <p className="card-sub">{s.home.cardLine(r.commune, card.id)}</p>
          </div>
          <span className={`pill ${STATUS_PILL[card.status]}`}>{s.card.statusText[card.status]}</span>
        </div>
        <hr className="divider" />
        <div className="center">
          <p className="muted small">{s.card.available}</p>
          <p className="amount amount-sm amount-center">
            <span className="amount-code">US$</span>
            <span>{card.availableUsd.toFixed(2)}</span>
          </p>
        </div>
      </Card>

      {card.status === "Pending" && !card.activationRequested ? (
        <StatusLine icon={Clock} tone="info">
          {s.card.waiting}
        </StatusLine>
      ) : null}

      <Rows>
        <Row label={s.card.id} value={<span className="mono">{card.id}</span>} />
        <Row label={s.card.lines} value={s.card.linesValue(card.linesUsed, CONFIG.linesPerCard)} />
        <Meter value={card.linesUsed} max={CONFIG.linesPerCard} />
      </Rows>

      {tx ? (
        <a className="ext-link" href={explorerTxUrl(tx)} target="_blank" rel="noreferrer">
          <ExternalLink className="icon" aria-hidden />
          <span>{s.receipt}</span>
        </a>
      ) : null}
      <p className="helper">{s.card.downloadedOnce}</p>
    </Screen>
  );
}
