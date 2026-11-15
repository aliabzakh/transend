"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { Amount } from "@/components/ui/Amount";
import { ResultMark } from "@/components/ui/ResultMark";
import { Row, Rows } from "@/components/ui/Row";
import { StatusLine } from "@/components/ui/StatusLine";
import { getLastResult, setPending } from "@/lib/client/shop";
import { explorerTxUrl } from "@/lib/config";
import { s } from "@/strings/shop.en";

export default function ApprovedPage() {
  const router = useRouter();
  const r = getLastResult();

  useEffect(() => {
    if (!r || !r.ok) router.replace("/shop");
  }, [r, router]);
  if (!r || !r.ok) return null;

  return (
    <Screen
      mark={<ResultMark kind="ok" />}
      title={s.approved.title}
      action={
        <Button
          onClick={() => {
            setPending(null);
            router.push("/shop");
          }}
        >
          {s.approved.next}
        </Button>
      }
    >
      {/* "Pay US$X", very large: the one thing the shopkeeper must read. */}
      <div className="result-big" role="status">
        <p className="result-label">{s.approved.pay}</p>
        <Amount value={r.payUsd} currency="USD" center reveal />
      </div>
      <Rows>
        <Row label={s.approved.card} value={<span className="mono">{r.cardId}</span>} />
        <Row label={s.approved.line} value={r.line} />
        <Row
          label={s.approved.time}
          value={new Date(r.at).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" })}
        />
      </Rows>
      <StatusLine icon={CheckCircle2} tone="ok">
        {s.approved.paidBack}
      </StatusLine>
      <a className="ext-link" href={explorerTxUrl(r.txHash)} target="_blank" rel="noreferrer">
        <ExternalLink className="icon" aria-hidden />
        <span>{s.approved.receipt}</span>
      </a>
    </Screen>
  );
}
