"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Send, Timer, XCircle } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Amount } from "@/components/ui/Amount";
import { Row, Rows } from "@/components/ui/Row";
import { StatusLine } from "@/components/ui/StatusLine";
import { getQuote, send, useMe, type LiveQuote } from "@/lib/client/sender";
import { ApiError } from "@/lib/client/api";
import { cad } from "@/lib/format";
import { s } from "@/strings/sender.en";

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
        <p className="muted">{s.loading}</p>
      </Screen>
    );
  }

  if (!chosen?.card) {
    return (
      <Screen title={s.send.title} back={{ href: "/app", label: s.back }}>
        <p>{s.send.noCard}</p>
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
          <Button type="submit" disabled={busy}>
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
          <p className="lead">
            {s.send.to} <strong>{chosen.name}</strong>
          </p>
        )}
        <Input
          label={s.send.amount}
          hint={s.send.amountHint}
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {error ? (
          <div className="notice">
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
            <Button icon={RefreshCw} onClick={fetchQuote} disabled={busy}>
              {s.send.newQuote}
            </Button>
          ) : (
            <Button
              icon={Send}
              disabled={busy}
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
          <Button variant="secondary" onClick={() => setLive(null)} disabled={busy}>
            {s.send.changeAmount}
          </Button>
        </>
      }
    >
      <div>
        <div className="muted">{s.send.sheGets}</div>
        <Amount value={live.usdOut} currency="USD" />
      </div>
      <Rows>
        <Row label={s.send.youSend} value={cad(live.amountCad)} />
        <Row label={s.send.fee} value={cad(live.feeCad)} />
        <Row label={s.send.rate} value={live.rate.toFixed(4)} />
        <Row label={s.send.allIn} value={`${live.allInPct.toFixed(3)}%`} />
      </Rows>
      <p className="muted small">{s.send.demoRateNote}</p>
      {error ? (
        <div className="notice">
          <StatusLine icon={XCircle}>{error}</StatusLine>
        </div>
      ) : null}
      {expired ? (
        <div className="notice">
          <StatusLine icon={XCircle}>{s.send.expired}</StatusLine>
        </div>
      ) : (
        <StatusLine icon={Timer}>{s.send.expiresIn(left)}</StatusLine>
      )}
    </Screen>
  );
}
