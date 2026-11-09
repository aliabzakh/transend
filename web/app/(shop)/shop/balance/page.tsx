"use client";

import { useState } from "react";
import { ArrowRight, XCircle } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Amount } from "@/components/ui/Amount";
import { PinPad } from "@/components/ui/PinPad";
import { StatusLine } from "@/components/ui/StatusLine";
import { balanceFor } from "@/lib/demo/shop-engine";
import { isCardId } from "@/lib/demo/codes";
import { s } from "@/strings/shop.en";

export default function BalancePage() {
  const [cardId, setCardId] = useState("TS4F2K9Q");
  const [step, setStep] = useState<"id" | "pin" | "result">("id");
  const [balance, setBalance] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (step === "id") {
    return (
      <Screen
        title={s.balance.title}
        back={{ href: "/shop", label: s.back }}
        onSubmit={(e) => {
          e.preventDefault();
          const id = cardId.trim().toUpperCase();
          if (!isCardId(id)) return setError(s.activate.badId);
          setCardId(id);
          setError(null);
          setStep("pin");
        }}
        action={
          <Button type="submit" icon={ArrowRight}>
            {s.balance.show}
          </Button>
        }
      >
        <Input
          label={s.balance.cardId}
          mono
          autoCapitalize="characters"
          autoComplete="off"
          value={cardId}
          onChange={(e) => setCardId(e.target.value)}
        />
        {error ? <StatusLine icon={XCircle}>{error}</StatusLine> : null}
      </Screen>
    );
  }

  if (step === "pin") {
    return (
      <Screen title={s.pin.title}>
        <p className="lead">{s.pin.lead}</p>
        {error ? <StatusLine icon={XCircle}>{error}</StatusLine> : null}
        <PinPad
          submitLabel={s.pin.submit}
          clearLabel={s.pin.clear}
          backLabel={s.pin.back}
          onSubmit={(pin) => {
            const res = balanceFor(cardId, pin);
            if (!res.ok) {
              const r = s.declined.reasons[res.reason];
              setError(`${s.declined.title}: ${r.why}. ${r.what}`);
              return;
            }
            setBalance(res.balanceUsd);
            setError(null);
            setStep("result");
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen title={s.balance.result} action={<Button href="/shop">{s.balance.done}</Button>}>
      <Amount value={balance} currency="USD" />
      <p className="mono muted">{cardId}</p>
    </Screen>
  );
}
