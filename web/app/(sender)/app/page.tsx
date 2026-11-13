"use client";

import Link from "next/link";
import { AlertTriangle, BellRing, Plus, Send, WifiOff } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { StatusLine } from "@/components/ui/StatusLine";
import { useMe } from "@/lib/client/sender";
import { formatWhen } from "@/lib/format";
import { s } from "@/strings/sender.en";

export default function HomePage() {
  // Refresh every 10 s so a shop's activation request or a pickup shows up on its own.
  const { me, error } = useMe(10_000);
  if (!me) {
    return (
      <Screen title={s.home.title}>
        {error ? <StatusLine icon={WifiOff}>{s.errors[error] ?? s.errors.server_error}</StatusLine> : <p className="muted">{s.loading}</p>}
      </Screen>
    );
  }

  const rows = me.recipients;
  const held = rows.filter((r) => r.card?.status === "Frozen");
  const asking = rows.filter((r) => r.card?.activationRequested);
  const canSend = rows.some((r) => r.card && (r.card.status === "Active" || r.card.status === "Pending"));

  return (
    <Screen
      title={s.home.title}
      action={
        <>
          {canSend ? (
            <Button href="/app/send" icon={Send}>
              {s.home.send}
            </Button>
          ) : null}
          {rows.length < 3 ? (
            <Button href="/app/recipients/new" variant={canSend ? "secondary" : "primary"} icon={Plus}>
              {s.home.add}
            </Button>
          ) : null}
        </>
      }
    >
      {held.map((r) => (
        <div className="notice" key={`h-${r.id}`}>
          <StatusLine icon={AlertTriangle}>{s.home.holdAlert(r.name)}</StatusLine>
          <Button href={`/app/alert/${r.card!.id}`} variant="secondary">
            {s.home.holdAction}
          </Button>
        </div>
      ))}
      {asking.map((r) => (
        <div className="notice" key={`a-${r.id}`}>
          <StatusLine icon={BellRing}>{s.home.approveAlert(r.name)}</StatusLine>
          <Button href={`/app/cards/${r.card!.id}`} variant="secondary">
            {s.home.approveAction}
          </Button>
        </div>
      ))}

      <section className="stack">
        <h2 className="section-title">{s.home.recipients}</h2>
        {rows.length === 0 ? <p className="muted">{s.home.none}</p> : null}
        {rows.map((r) =>
          r.card ? (
            <Link key={r.id} href={`/app/cards/${r.card.id}`} className="link-card">
              <strong>{r.name}</strong>
              <span className="muted">
                {r.relationship}, {r.commune}
              </span>
              <span>{s.card.statusText[r.card.status]}</span>
              <span>{s.home.balanceLine(r.card.availableUsd.toFixed(2))}</span>
              {r.card.setAsideUsd > 0 ? (
                <span className="muted">{s.home.growingLine(r.card.setAsideUsd.toFixed(2))}</span>
              ) : null}
            </Link>
          ) : (
            <div key={r.id} className="link-card">
              <strong>{r.name}</strong>
              <span className="muted">
                {r.relationship}, {r.commune}
              </span>
            </div>
          ),
        )}
      </section>

      <section className="stack">
        <h2 className="section-title">{s.home.activity}</h2>
        {me.activity.length === 0 ? <p className="muted">{s.home.noActivity}</p> : null}
        <ul className="list">
          {me.activity.slice(0, 4).map((a) => (
            <li key={a.id} className="list-item">
              <span>{a.text}</span>
              <time className="muted small" suppressHydrationWarning>
                {formatWhen(a.at)}
              </time>
            </li>
          ))}
        </ul>
      </section>
    </Screen>
  );
}
