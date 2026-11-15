"use client";

import { useEffect, useRef, useState } from "react";
import { Hourglass, Send, XCircle } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PinPad } from "@/components/ui/PinPad";
import { StatusLine } from "@/components/ui/StatusLine";
import { ResultMark } from "@/components/ui/ResultMark";
import { HandOverIcon } from "@/components/ui/HandOverIcon";
import { activationState, requestActivation, setPin, setLastCardId } from "@/lib/client/shop";
import { ApiError } from "@/lib/client/api";
import { isCardId } from "@/lib/cards/format";
import { s } from "@/strings/shop.en";

type Step = "id" | "waiting" | "pin1" | "pin1b" | "saving" | "done";

const PROMPT: Record<"pin1" | "pin1b", string> = {
  pin1: s.activate.pin1,
  pin1b: s.activate.pin1Again,
};

const reasonText = (e: unknown) =>
  s.activate.errors[e instanceof ApiError ? e.reason : "no_signal"] ?? s.activate.errors.unavailable;

export default function ActivatePage() {
  const [step, setStep] = useState<Step>("id");
  const [cardId, setCardId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The first PIN entry is held only in memory, for the length of this flow.
  const pins = useRef<{ pin?: string }>({});

  // Wait for the sender's "Yes, that's her".
  useEffect(() => {
    if (step !== "waiting") return;
    let alive = true;
    const poll = async () => {
      try {
        const { state } = await activationState(cardId);
        if (!alive) return;
        if (state === "approved") setStep("pin1");
        if (state === "done") setStep("done");
      } catch {
        /* keep waiting; a dropped connection retries on the next tick */
      }
    };
    poll();
    const t = setInterval(poll, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [step, cardId]);

  const restart = (msg: string) => {
    pins.current = {};
    setError(msg);
    setStep("pin1");
  };

  const onPin = async (pin: string) => {
    setError(null);
    if (step === "pin1") {
      pins.current.pin = pin;
      setStep("pin1b");
      return;
    }
    if (pin !== pins.current.pin) return restart(s.activate.mismatch);
    pins.current = {};
    setStep("saving");
    try {
      await setPin(cardId, pin);
      setLastCardId(cardId);
      setStep("done");
    } catch (e) {
      restart(reasonText(e));
    }
  };

  if (step === "id") {
    return (
      <Screen
        title={s.activate.title}
        back={{ href: "/shop", label: s.back }}
        onSubmit={async (e) => {
          e.preventDefault();
          const id = cardId.trim().toUpperCase();
          if (!isCardId(id)) return setError(s.activate.badId);
          setBusy(true);
          setError(null);
          try {
            await requestActivation(id);
            setCardId(id);
            setStep("waiting");
          } catch (err) {
            setError(reasonText(err));
          }
          setBusy(false);
        }}
        action={
          <Button type="submit" icon={Send} busy={busy}>
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
          <div className="notice notice-error">
            <StatusLine icon={XCircle}>{error}</StatusLine>
          </div>
        ) : null}
      </Screen>
    );
  }

  if (step === "waiting") {
    return (
      <Screen title={s.activate.waiting} center>
        <span className="waiting" aria-hidden>
          <Hourglass className="icon" />
        </span>
        <p className="muted" role="status">
          {s.activate.waitingLead}
        </p>
        <p className="code">{cardId}</p>
      </Screen>
    );
  }

  if (step === "done") {
    return (
      <Screen
        mark={<ResultMark kind="ok" />}
        title={s.activate.done}
        action={<Button href="/shop">{s.activate.finish}</Button>}
      >
        <p className="muted" role="status">
          {s.activate.doneLead}
        </p>
      </Screen>
    );
  }

  return (
    <Screen title={s.activate.handOver} titleIcon={HandOverIcon} eyebrow={s.activate.approved}>
      {error ? (
        <div className="notice notice-error">
          <StatusLine icon={XCircle}>{error}</StatusLine>
        </div>
      ) : null}
      {step === "saving" ? (
        <div className="stack center">
          <span className="waiting" aria-hidden>
            <HandOverIcon className="icon" />
          </span>
          <p className="lead" role="status">
            {s.pin.working}
          </p>
        </div>
      ) : (
        <>
          <div className="spread">
            <p className="lead">{PROMPT[step]}</p>
            <span className="pill pill-wait">{s.activate.pinStep(step === "pin1" ? 1 : 2)}</span>
          </div>
          <PinPad
            resetKey={step}
            submitLabel={s.activate.submit}
            clearLabel={s.pin.clear}
            backLabel={s.pin.back}
            onSubmit={onPin}
          />
        </>
      )}
    </Screen>
  );
}
