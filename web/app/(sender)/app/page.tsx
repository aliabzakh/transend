"use client";

import { AlertTriangle, BellRing, Plus, Send, WifiOff } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusLine } from "@/components/ui/StatusLine";
import { useMe } from "@/lib/client/sender";
import { formatWhen, usd } from "@/lib/format";
import { s } from "@/strings/sender.en";

const STATUS_PILL = { Pending: "pill-wait", Active: "pill-ok", Frozen: "pill-warn", Retired: "pill-muted" } as const;
const firstName = (name: string | null | undefined) => name?.trim().split(/\s+/)[0] || null;

export default function HomePage() {
  // Refresh every 10 s so a shop's activation request or a pickup shows up on its own.
  const { me, error } = useMe(10_000);
  if (!me) {
    return (
      <Screen title={s.home.title}>
        {error ? (
          <div className="notice notice-error">
            <StatusLine icon={WifiOff}>{s.errors[error] ?? s.errors.server_error}</StatusLine>
          </div>
        ) : (
          <>
            <Skeleton label={s.loading} />
            <Skeleton />
            <Skeleton kind="tall" />
          </>
        )}
      </Screen>
    );
  }

  const rows = me.recipients;
  const held = rows.filter((r) => r.card?.status === "Frozen");
  const asking = rows.filter((r) => r.card?.activationRequested);
  const canSend = rows.some((r) => r.card && (r.card.status === "Active" || r.card.status === "Pending"));

  return (
    <Screen
      eyebrow={s.home.greeting(firstName(me.name))}
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
        <div className="notice notice-warn" key={`h-${r.id}`}>
          <StatusLine icon={AlertTriangle}>{s.home.holdAlert(r.name)}</StatusLine>
          <Button href={`/app/alert/${r.card!.id}`} variant="secondary">
            {s.home.holdAction}
          </Button>
        </div>
      ))}
      {asking.map((r) => (
        <div className="notice" key={`a-${r.id}`}>
          <StatusLine icon={BellRing}>{s.home.approveAlert(r.name)}</StatusLine>
          <Button href={`/app/cards/${r.card!.id}`}>{s.home.approveAction}</Button>
        </div>
      ))}

      <section className="stack" aria-labelledby="who-h">
        <h2 id="who-h" className="section-label">
          {s.home.recipients}
        </h2>
        {rows.length === 0 ? <p className="muted">{s.home.none}</p> : null}
        {rows.map((r) =>
          r.card ? (
            <Card key={r.id} href={`/app/cards/${r.card.id}`} variant="row">
              <Avatar name={r.name} />
              <div className="card-grow">
                <p className="card-name">{r.name}</p>
                <p className="card-sub">{s.home.cardLine(r.commune, r.card.id)}</p>
              </div>
              <div className="card-end">
                <span className={`pill ${STATUS_PILL[r.card.status]}`}>{s.card.statusText[r.card.status]}</span>
                <span className="tabular strong">{usd(r.card.availableUsd)}</span>
              </div>
            </Card>
          ) : (
            <Card key={r.id} variant="row">
              <Avatar name={r.name} />
              <div className="card-grow">
                <p className="card-name">{r.name}</p>
                <p className="card-sub">
                  {r.relationship}, {r.commune}
                </p>
              </div>
              <span className="pill pill-muted">{s.home.noCard}</span>
            </Card>
          ),
        )}
      </section>

      <section className="stack" aria-labelledby="latest-h">
        <h2 id="latest-h" className="section-label">
          {s.home.activity}
        </h2>
        {me.activity.length === 0 ? <p className="muted">{s.home.noActivity}</p> : null}
        {me.activity.length ? (
          <ul className="list list-card">
            {me.activity.slice(0, 4).map((a) => (
              <li key={a.id} className="list-item">
                <span>{a.text}</span>
                <time className="helper" suppressHydrationWarning>
                  {formatWhen(a.at)}
                </time>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </Screen>
  );
}
