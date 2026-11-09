"use client";

import { useParams } from "next/navigation";
import { BellRing, CheckCircle2, Clock, Download, Pause, Play } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { Row, Rows } from "@/components/ui/Row";
import { StatusLine } from "@/components/ui/StatusLine";
import {
  approveActivation,
  freezeCard,
  simulateDuress,
  simulateShopRequest,
  unfreezeCard,
  useSender,
} from "@/lib/demo/sender-store";
import { CONFIG } from "@/lib/config";
import { s } from "@/strings/sender.en";

export default function CardPage() {
  const { id } = useParams<{ id: string }>();
  const st = useSender();
  const card = st.cards.find((c) => c.id === id);
  const r = card ? st.recipients.find((x) => x.id === card.recipientId) : undefined;

  if (!card || !r) {
    return (
      <Screen title="Card" back={{ href: "/app", label: s.back }}>
        <p>We could not find this card.</p>
      </Screen>
    );
  }

  const statusIcon = card.status === "Active" ? CheckCircle2 : card.status === "Frozen" ? Pause : Clock;

  let action = null;
  if (card.activationRequested) {
    action = (
      <Button icon={CheckCircle2} onClick={() => approveActivation(card.id)}>
        {s.card.approve}
      </Button>
    );
  } else if (card.status === "Active") {
    action = (
      <Button variant="secondary" icon={Pause} onClick={() => freezeCard(card.id)}>
        {s.card.freeze}
      </Button>
    );
  } else if (card.status === "Frozen") {
    action = (
      <Button icon={Play} onClick={() => unfreezeCard(card.id)}>
        {s.card.unfreeze}
      </Button>
    );
  }

  return (
    <Screen title={s.card.title(r.name)} back={{ href: "/app", label: s.back }} action={action}>
      {card.activationRequested ? (
        <div className="notice">
          <StatusLine icon={BellRing}>{s.card.approveLead(r.name)}</StatusLine>
        </div>
      ) : null}
      {card.status === "Pending" && !card.activationRequested ? (
        <p className="muted">{s.card.waiting}</p>
      ) : null}

      <StatusLine icon={statusIcon}>{s.card.statusText[card.status]}</StatusLine>
      <Rows>
        <Row label={s.card.id} value={<span className="mono">{card.id}</span>} />
        <Row label={s.card.lines} value={s.card.linesValue(card.linesUsed, CONFIG.linesPerCard)} />
        <Row label={s.card.duress} value={s.card.duressValue(card.duressUsd.toFixed(2))} />
      </Rows>

      <Button href={`/app/cards/${card.id}/print`} variant="secondary" icon={Download}>
        {s.card.download}
      </Button>

      <section className="panel">
        <h2 className="section-title">{s.card.demoTitle}</h2>
        <Button variant="secondary" onClick={() => simulateShopRequest(card.id)} disabled={card.status !== "Pending"}>
          {s.card.demoShopRequest}
        </Button>
        <Button variant="secondary" onClick={() => simulateDuress(card.id)} disabled={card.status !== "Active"}>
          {s.card.demoDuress}
        </Button>
      </section>
    </Screen>
  );
}
