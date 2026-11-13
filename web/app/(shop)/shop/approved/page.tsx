"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { Amount } from "@/components/ui/Amount";
import { Row, Rows } from "@/components/ui/Row";
import { StatusLine } from "@/components/ui/StatusLine";
import { getLastResult, setPending } from "@/lib/demo/shop-engine";
import { explorerContractUrl } from "@/lib/config";
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
      <StatusLine icon={CheckCircle2}>{s.approved.title}</StatusLine>
      <div className="result-big">
        <p className="lead">{s.approved.pay}</p>
        <Amount value={r.payUsd} currency="USD" />
      </div>
      <Rows>
        <Row label={s.approved.card} value={<span className="mono">{r.cardId}</span>} />
        <Row label={s.approved.line} value={r.line} />
        <Row
          label={s.approved.time}
          value={new Date(r.at).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" })}
        />
      </Rows>
      <p>{s.approved.paidBack}</p>
      <a className="nav-link" href={explorerContractUrl} target="_blank" rel="noreferrer">
        <ExternalLink className="icon" aria-hidden />
        <span>{s.approved.receipt}</span>
      </a>
    </Screen>
  );
}
