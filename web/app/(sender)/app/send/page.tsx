"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Send, XCircle } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { AmountInput, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Meter } from "@/components/ui/Meter";
import { Skeleton } from "@/components/ui/Skeleton";
import { Row } from "@/components/ui/Row";
import { StatusLine } from "@/components/ui/StatusLine";
import { getQuote, send, useMe, type LiveQuote } from "@/lib/client/sender";
import { ApiError } from "@/lib/client/api";
import { cad, usd } from "@/lib/format";
import { s } from "@/strings/sender.en";

/** How long a quote holds, for the countdown bar. The words beside it come from the API's expiry. */
const QUOTE_SECONDS = 30;

const sendError = (e: unknown) => {
  const reason = e instanceof ApiError ? e.reason : "server_error";
  return s.send.errors[reason] ?? s.errors[reason] ?? s.errors.server_error;
};

export default function SendPage() {
  const router = useRouter();
  const { me } = useMe();
  const [cardId, setCardId] = useState("");
  const [amount, setAmount] = useState("200");
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<LiveQuote | null>(null);
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);

  const targets = (me?.recipients ?? []).filter(
    (r) => r.card && (r.card.status === "Active" || r.card.status === "Pending"),
  );
  const chosen = targets.find((r) => r.card!.id === cardId) ?? targets[0];

  useEffect(() => {
    if (!live) return;
    const expires = new Date(live.expiresAt).getTime();
    const tick = () => setLeft(Math.max(0, Math.ceil((expires - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [live]);

  const fetchQuote = async () => {
    if (!chosen?.card) return;
    setError(null);
    setBusy(true);
    try {
      setLive(await getQuote(chosen.card.id, Number(amount)));
    } catch (e) {
      setError(sendError(e));
    }
    setBusy(false);
  };

  if (!me) {
    return (
      <Screen title={s.send.title} back={{ href: "/app", label: s.back }}>
        <Skeleton label={s.loading} />
        <Skeleton kind="tall" />
      </Screen>
    );
  }

  if (!chosen?.card) {
    return (
      <Screen title={s.send.title} back={{ href: "/app", label: s.back }}>
        <p className="muted">{s.send.noCard}</p>
      </Screen>
    );
  }

  if (!live) {
    return (
      <Screen
        title={s.send.title}
        back={{ href: "/app", label: s.back }}
        onSubmit={(e) => {
          e.preventDefault();
          fetchQuote();
        }}
        action={
          <Button type="submit" busy={busy}>
            {s.send.getQuote}
          </Button>
        }
      >
        {targets.length > 1 ? (
          <Select label={s.send.to} value={chosen.card.id} onChange={(e) => setCardId(e.target.value)}>
            {targets.map((r) => (
              <option key={r.card!.id} value={r.card!.id}>
                {r.name}
              </option>
            ))}
          </Select>
        ) : (
          <RecipientCard name={chosen.name} commune={chosen.commune} cardId={chosen.card.id} />
        )}
        <AmountInput
          label={s.send.amount}
          hint={s.send.amountHint}
          prefix="C$"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {error ? (
          <div className="notice notice-error">
            <StatusLine icon={XCircle}>{error}</StatusLine>
          </div>
        ) : null}
      </Screen>
    );
  }

  const expired = left === 0;
  return (
    <Screen
      title={s.send.quoteTitle}
      action={
        <>
          {expired ? (
            <Button icon={RefreshCw} onClick={fetchQuote} busy={busy}>
              {s.send.newQuote}
            </Button>
          ) : (
            <Button
              icon={Send}
              busy={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  const res = await send(live.quoteId);
                  router.push(
                    `/app/done?kind=sent&card=${res.cardId}&usd=${res.usdOut}&cad=${res.amountCad}&tx=${res.txHash}`,
                  );
                } catch (e) {
                  setError(sendError(e));
                  setBusy(false);
                }
              }}
            >
              {busy ? s.send.sending : s.send.confirm(chosen.name.split(" ")[0])}
            </Button>
          )}
          <Button variant="ghost" onClick={() => setLive(null)} disabled={busy}>
            {s.send.changeAmount}
          </Button>
        </>
      }
    >
      <RecipientCard name={chosen.name} commune={chosen.commune} cardId={chosen.card.id} />
      <div className="center">
        <p className="muted small">{s.send.youSend}</p>
        <p className="amount amount-center">
          <span className="amount-code">C$</span>
          <span>{live.amountCad.toFixed(2)}</span>
        </p>
      </div>
      <Card label={s.send.quoteTitle}>
        <Row label={s.send.sheGets} value={<span className="strong">{usd(live.usdOut)}</span>} />
        <Row label={s.send.fee} value={cad(live.feeCad)} />
        <Row label={s.send.rateLabel} value={s.send.rateValue(live.rate.toFixed(4))} />
        <Row label={s.send.allIn} value={`${live.allInPct.toFixed(3)}%`} />
        <hr className="divider" />
        <div className="countdown stack-sm" role="timer" aria-live="off">
          <Row label={s.send.heldFor} value={expired ? s.send.expired : s.send.heldValue(left)} />
          <Meter value={left} max={QUOTE_SECONDS} countdown />
        </div>
      </Card>
      <p className="helper center">{s.send.demoRateNote}</p>
      {error ? (
        <div className="notice notice-error">
          <StatusLine icon={XCircle}>{error}</StatusLine>
        </div>
      ) : null}
      {expired ? (
        <div className="notice notice-error">
          <StatusLine icon={XCircle}>{s.send.expired}</StatusLine>
        </div>
      ) : null}
    </Screen>
  );
}

/** The person being paid: Gold initial, name, commune and card ID in full. */
function RecipientCard({ name, commune, cardId }: { name: string; commune: string; cardId: string }) {
  return (
    <Card variant="row">
      <Avatar name={name} />
      <div className="card-grow">
        <p className="card-name">{name}</p>
        <p className="card-sub">{s.home.cardLine(commune, cardId)}</p>
      </div>
    </Card>
  );
}
