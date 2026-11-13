"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ExternalLink, Send } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { Amount } from "@/components/ui/Amount";
import { Row, Rows } from "@/components/ui/Row";
import { StatusLine } from "@/components/ui/StatusLine";
import { useMe } from "@/lib/client/sender";
import { explorerTxUrl } from "@/lib/config";
import { cad } from "@/lib/format";
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
      {tx && /^[0-9a-f]{64}$/.test(tx) ? (
        <a className="nav-link" href={explorerTxUrl(tx)} target="_blank" rel="noreferrer">
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
