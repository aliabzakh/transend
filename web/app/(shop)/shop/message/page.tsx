"use client";

import { useState } from "react";
import { Check, Send, XCircle } from "lucide-react";
import { ResultMark } from "@/components/ui/ResultMark";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusLine } from "@/components/ui/StatusLine";
import { getLastCardId, sendReply } from "@/lib/client/shop";
import { isCardId } from "@/lib/cards/format";
import { s } from "@/strings/shop.en";

export default function MessagePage() {
  const [cardId, setCardId] = useState(getLastCardId());
  const [choice, setChoice] = useState<number | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  if (sent) {
    return (
      <Screen
        mark={<ResultMark kind="ok" />}
        title={s.message.sent}
        action={<Button href="/shop">{s.home.title}</Button>}
      >
        <p className="muted" role="status">
          {s.message.sentLead}
        </p>
      </Screen>
    );
  }

  return (
    <Screen
      title={s.message.title}
      back={{ href: "/shop", label: s.back }}
      action={
        <Button
          icon={Send}
          disabled={choice === null || !isCardId(cardId)}
          busy={busy}
          onClick={async () => {
            setBusy(true);
            setError(false);
            try {
              await sendReply(cardId.trim().toUpperCase(), choice!);
              setSent(true);
            } catch {
              setError(true);
            }
            setBusy(false);
          }}
        >
          {s.message.send}
        </Button>
      }
    >
      <p className="muted">{s.message.lead}</p>
      <Input
        label={s.message.cardId}
        mono
        autoCapitalize="characters"
        autoComplete="off"
        value={cardId}
        onChange={(e) => setCardId(e.target.value)}
      />
      <div className="choices" role="radiogroup" aria-label={s.message.title}>
        {s.message.options.map((text, i) => (
          <button
            key={text}
            type="button"
            role="radio"
            aria-checked={choice === i}
            className="choice"
            onClick={() => setChoice(i)}
          >
            <span>{text}</span>
            <span className="choice-check" aria-hidden>
              <Check className="icon" />
            </span>
          </button>
        ))}
      </div>
      {error ? (
        <div className="notice notice-error">
          <StatusLine icon={XCircle}>{s.message.error}</StatusLine>
        </div>
      ) : null}
    </Screen>
  );
}
