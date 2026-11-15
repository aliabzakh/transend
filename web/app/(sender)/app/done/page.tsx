"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ExternalLink, Send } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { Amount } from "@/components/ui/Amount";
import { Card } from "@/components/ui/Card";
import { ResultMark } from "@/components/ui/ResultMark";
import { Row, Rows } from "@/components/ui/Row";
import { useMe } from "@/lib/client/sender";
import { explorerTxUrl } from "@/lib/config";
import { cad, usd as fmtUsd } from "@/lib/format";
import { s } from "@/strings/sender.en";

function Done() {
  const q = useSearchParams();
  const { me } = useMe();
  const kind = q.get("kind") === "pickup" ? "pickup" : "sent";
  const cardId = q.get("card") ?? "";
  const usd = Number(q.get("usd") ?? 0);
  const cadAmount = Number(q.get("cad") ?? 0);
  const tx = q.get("tx");
  const r = me?.recipients.find((x) => x.card?.id === cardId);
  const name = r?.name.split(" ")[0] ?? "Your family";

  return (
    <Screen
      mark={<ResultMark kind={kind === "sent" ? "wait" : "ok"} />}
      title={kind === "sent" ? s.done.sentTitle : s.done.pickupTitle(name)}
      action={
        <>
          <Button href="/app/send" variant="secondary" icon={Send}>
            {s.done.more}
          </Button>
          <Button href="/app" variant="ghost">
            {s.nav.home}
          </Button>
        </>
      }
    >
      <p className="muted">{kind === "sent" ? s.done.sentLead(name) : s.done.pickupLead}</p>
      <Card variant="receipt">
        <Amount value={usd} currency="USD" small center reveal />
        <hr className="divider" />
        <Rows plain>
          {r ? <Row label={s.done.to} value={r.name} /> : null}
          {kind === "sent" && cadAmount ? <Row label={s.send.youSend} value={cad(cadAmount)} /> : null}
          {r?.card ? <Row label={s.done.leftOnCard} value={fmtUsd(r.card.availableUsd)} /> : null}
        </Rows>
      </Card>
      {tx && /^[0-9a-f]{64}$/.test(tx) ? (
        <a className="ext-link" href={explorerTxUrl(tx)} target="_blank" rel="noreferrer">
          <ExternalLink className="icon" aria-hidden />
          <span>{s.done.receipt}</span>
        </a>
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
