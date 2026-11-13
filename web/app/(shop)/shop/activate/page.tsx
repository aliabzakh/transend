"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Hourglass, Send, XCircle } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PinPad } from "@/components/ui/PinPad";
import { StatusLine } from "@/components/ui/StatusLine";
import { activate } from "@/lib/demo/shop-engine";
import { isCardId } from "@/lib/demo/codes";
import { s } from "@/strings/shop.en";

type Step = "id" | "waiting" | "pin1" | "pin1b" | "done";

const PROMPT: Record<"pin1" | "pin1b", string> = {
  pin1: s.activate.pin1,
  pin1b: s.activate.pin1Again,
};

export default function ActivatePage() {
  const [step, setStep] = useState<Step>("id");
  const [cardId, setCardId] = useState("");
  const [error, setError] = useState<string | null>(null);
  // PINs are held only in memory for the length of this flow.
  const pins = useRef<{ pin?: string }>({});

  // Demo: the sender approves a moment after the shop asks.
  useEffect(() => {
    if (step !== "waiting") return;
    const t = setTimeout(() => setStep("pin1"), 2500);
    return () => clearTimeout(t);
  }, [step]);

  const restart = (msg: string) => {
    pins.current = {};
    setError(msg);
    setStep("pin1");
  };

  const onPin = (pin: string) => {
    setError(null);
    if (step === "pin1") {
      pins.current.pin = pin;
      setStep("pin1b");
    } else if (step === "pin1b") {
      if (pin !== pins.current.pin) return restart(s.activate.mismatch);
      const res = activate(cardId, pins.current.pin!);
      pins.current = {};
      if (!res.ok) return restart(s.activate.mismatch);
      setStep("done");
    }
  };

  if (step === "id") {
    return (
      <Screen
        title={s.activate.title}
        back={{ href: "/shop", label: s.back }}
        onSubmit={(e) => {
          e.preventDefault();
          const id = cardId.trim().toUpperCase();
          if (!isCardId(id)) return setError(s.activate.badId);
          setCardId(id);
          setError(null);
          setStep("waiting");
        }}
        action={
          <Button type="submit" icon={Send}>
            {s.activate.ask}
          </Button>
        }
      >
        <Input
          label={s.activate.cardId}
          hint={s.activate.cardIdHint}
          mono
          autoCapitalize="characters"
          autoComplete="off"
          value={cardId}
          onChange={(e) => setCardId(e.target.value)}
        />
        {error ? (
          <StatusLine icon={XCircle}>{error}</StatusLine>
        ) : null}
      </Screen>
    );
  }

  if (step === "waiting") {
    return (
      <Screen title={s.activate.waiting}>
        <StatusLine icon={Hourglass}>{s.activate.waitingLead}</StatusLine>
        <p className="mono lead">{cardId}</p>
      </Screen>
    );
  }

  if (step === "done") {
    return (
      <Screen
        title={s.activate.done}
        action={<Button href="/shop">{s.activate.finish}</Button>}
      >
        <StatusLine icon={CheckCircle2}>{s.activate.doneLead}</StatusLine>
      </Screen>
    );
  }

  return (
    <Screen title={s.activate.handOver}>
      <StatusLine icon={CheckCircle2}>{s.activate.approved}</StatusLine>
      {error ? <StatusLine icon={XCircle}>{error}</StatusLine> : null}
      <p className="lead">{PROMPT[step]}</p>
      <PinPad
        resetKey={step}
        submitLabel={s.activate.submit}
        clearLabel={s.pin.clear}
        backLabel={s.pin.back}
        onSubmit={onPin}
      />
    </Screen>
  );
}
