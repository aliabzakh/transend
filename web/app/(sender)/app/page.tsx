"use client";

import Link from "next/link";
import { AlertTriangle, BellRing, Plus, Send } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { StatusLine } from "@/components/ui/StatusLine";
import { useSender } from "@/lib/demo/sender-store";
import { formatWhen } from "@/lib/format";
import { s } from "@/strings/sender.en";

export default function HomePage() {
  const st = useSender();
  const rows = st.recipients.map((r) => ({ r, card: st.cards.find((c) => c.id === r.cardId)! }));
  const held = rows.filter((x) => x.card.status === "Frozen");
  const asking = rows.filter((x) => x.card.activationRequested);

  return (
    <Screen
      title={s.home.title}
      action={
        <>
          <Button href="/app/send" icon={Send}>
            {s.home.send}
          </Button>
          <Button href="/app/recipients/new" variant="secondary" icon={Plus}>
            {s.home.add}
          </Button>
        </>
      }
    >
      {held.map(({ r, card }) => (
        <div className="notice" key={`h-${card.id}`}>
          <StatusLine icon={AlertTriangle}>{s.home.holdAlert(r.name)}</StatusLine>
          <Button href={`/app/alert/${card.id}`} variant="secondary">
            {s.home.holdAction}
          </Button>
        </div>
      ))}
      {asking.map(({ r, card }) => (
        <div className="notice" key={`a-${card.id}`}>
          <StatusLine icon={BellRing}>{s.home.approveAlert(r.name)}</StatusLine>
          <Button href={`/app/cards/${card.id}`} variant="secondary">
            {s.home.approveAction}
          </Button>
        </div>
      ))}

      <section className="stack">
        <h2 className="section-title">{s.home.recipients}</h2>
        {rows.length === 0 ? <p className="muted">{s.home.none}</p> : null}
        {rows.map(({ r, card }) => (
          <Link key={r.id} href={`/app/cards/${card.id}`} className="link-card">
            <strong>{r.name}</strong>
            <span className="muted">
              {r.relationship}, {r.commune}
            </span>
            <span>{s.card.statusText[card.status]}</span>
            <span>{s.home.balanceLine(card.balanceUsd.toFixed(2))}</span>
          </Link>
        ))}
      </section>

      <section className="stack">
        <h2 className="section-title">{s.home.activity}</h2>
        {st.activity.length === 0 ? <p className="muted">{s.home.noActivity}</p> : null}
        <ul className="list">
          {st.activity.slice(0, 4).map((a) => (
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
