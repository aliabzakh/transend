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
import { send, useSender } from "@/lib/demo/sender-store";
import { quote, type Quote } from "@/lib/quote";
import { CONFIG } from "@/lib/config";
import { cad } from "@/lib/format";
import { s } from "@/strings/sender.en";

type Live = Extract<Quote, { ok: true }> & { expiresAt: number };

export default function SendPage() {
  const router = useRouter();
  const st = useSender();
  const active = st.cards.filter((c) => c.status === "Active");
  const [cardId, setCardId] = useState("");
  const [amount, setAmount] = useState("200");
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<Live | null>(null);
  const [left, setLeft] = useState(0);

  const chosen = active.find((c) => c.id === cardId) ?? active[0];
  const recipient = chosen ? st.recipients.find((r) => r.id === chosen.recipientId) : undefined;

  useEffect(() => {
    if (!live) return;
    const tick = () => setLeft(Math.max(0, Math.ceil((live.expiresAt - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [live]);

  const getQuote = () => {
    setError(null);
    const n = Number(amount);
    const q = quote(n);
    if (!q.ok) return setError(q.reason === "too_small" ? s.send.tooSmall : s.send.notANumber);
    if (st.sentTodayCad + n > CONFIG.maxPerDayCad) return setError(s.send.overDay);
    if (chosen && chosen.balanceUsd + q.usdOut > CONFIG.maxCardBalanceUsd) return setError(s.send.overCard);
    setLive({ ...q, expiresAt: Date.now() + CONFIG.quoteSeconds * 1000 });
  };

  if (!chosen || !recipient) {
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
          getQuote();
        }}
        action={<Button type="submit">{s.send.getQuote}</Button>}
      >
        {active.length > 1 ? (
          <Select label={s.send.to} value={chosen.id} onChange={(e) => setCardId(e.target.value)}>
            {active.map((c) => (
              <option key={c.id} value={c.id}>
                {st.recipients.find((r) => r.id === c.recipientId)?.name}
              </option>
            ))}
          </Select>
        ) : (
          <p className="lead">
            {s.send.to} <strong>{recipient.name}</strong>
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
            <Button icon={RefreshCw} onClick={getQuote}>
              {s.send.newQuote}
            </Button>
          ) : (
            <Button
              icon={Send}
              onClick={() => {
                send(chosen.id, live.amountCad, live.usdOut);
                router.push(`/app/done?kind=sent&card=${chosen.id}&usd=${live.usdOut}&cad=${live.amountCad}`);
              }}
            >
              {s.send.confirm(recipient.name)}
            </Button>
          )}
          <Button variant="secondary" onClick={() => setLive(null)}>
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
