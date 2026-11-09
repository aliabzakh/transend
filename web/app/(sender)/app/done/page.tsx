"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ExternalLink, HandCoins, Send } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { Amount } from "@/components/ui/Amount";
import { Row, Rows } from "@/components/ui/Row";
import { StatusLine } from "@/components/ui/StatusLine";
import { simulatePickup, useSender } from "@/lib/demo/sender-store";
import { explorerContractUrl } from "@/lib/config";
import { cad } from "@/lib/format";
import { s } from "@/strings/sender.en";

function Done() {
  const router = useRouter();
  const q = useSearchParams();
  const st = useSender();
  const kind = q.get("kind") === "pickup" ? "pickup" : "sent";
  const cardId = q.get("card") ?? "";
  const usd = Number(q.get("usd") ?? 0);
  const cadAmount = Number(q.get("cad") ?? 0);
  const card = st.cards.find((c) => c.id === cardId);
  const r = card ? st.recipients.find((x) => x.id === card.recipientId) : undefined;
  const name = r?.name ?? "Your family";

  return (
    <Screen
      title={kind === "sent" ? s.done.sentTitle : s.done.pickupTitle(name)}
      action={
        <>
          <Button href="/app/send" icon={Send}>
            {s.done.more}
          </Button>
          <Button href="/app" variant="secondary">
            {s.nav.home}
          </Button>
        </>
      }
    >
      <StatusLine icon={CheckCircle2}>{kind === "sent" ? s.done.sentLead(name) : s.done.pickupLead}</StatusLine>
      <Amount value={usd} currency="USD" />
      <Rows>
        <Row label={s.done.amount} value={`US$${usd.toFixed(2)}`} />
        {kind === "sent" && cadAmount ? <Row label={s.send.youSend} value={cad(cadAmount)} /> : null}
      </Rows>
      <a className="nav-link" href={explorerContractUrl} target="_blank" rel="noreferrer">
        <ExternalLink className="icon" aria-hidden />
        <span>{s.done.receipt}</span>
      </a>
      {kind === "sent" && card ? (
        <section className="panel">
          <h2 className="section-title">{s.card.demoTitle}</h2>
          <Button
            variant="secondary"
            icon={HandCoins}
            onClick={() => {
              const amt = Math.min(60, card.balanceUsd);
              simulatePickup(card.id, amt);
              router.replace(`/app/done?kind=pickup&card=${card.id}&usd=${amt}`);
            }}
          >
            {s.done.demoPickup}
          </Button>
        </section>
      ) : null}
    </Screen>
  );
}

export default function DonePage() {
  return (
    <Suspense fallback={null}>
      <Done />
    </Suspense>
  );
}
