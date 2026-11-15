"use client";

import { useState } from "react";
import { Ban, Check, ShieldAlert, ShieldCheck } from "lucide-react";
import { PinPad } from "@/components/ui/PinPad";
import { HandOverIcon } from "@/components/ui/HandOverIcon";

const AREAS = [
  ["calm", "Calm", ShieldCheck],
  ["tense", "Tense", ShieldAlert],
  ["closed", "Closed", Ban],
] as const;
const REPLIES = ["Received, thank you", "All is well", "Please call me"];

/** The interactive pieces of the style guide. The PIN entered here goes nowhere. */
export function StyleguidePin() {
  const [area, setArea] = useState("calm");
  const [reply, setReply] = useState<number | null>(0);
  const [last, setLast] = useState<string | null>(null);
  return (
    <>
      <div className="sg-phone">
        <div className="segmented" role="group" aria-label="Area">
          {AREAS.map(([id, label, Icon]) => (
            <button key={id} type="button" className="seg" data-tone={id} aria-pressed={area === id} onClick={() => setArea(id)}>
              <Icon className="icon" aria-hidden />
              {label}
            </button>
          ))}
        </div>
        <div className="choices" role="radiogroup" aria-label="Reply">
          {REPLIES.map((t, i) => (
            <button key={t} type="button" role="radio" aria-checked={reply === i} className="choice" onClick={() => setReply(i)}>
              <span>{t}</span>
              <span className="choice-check" aria-hidden>
                <Check className="icon" />
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="sg-phone">
        <p className="screen-title screen-title-compact">
          <HandOverIcon className="icon" />
          <span>Hand the phone to your customer</span>
        </p>
        <div className="card card-tight handover">
          <p className="caption muted">Card line 4 · ready</p>
          <p className="code">QWCA 5KHE 7QET</p>
          <p className="handover-amount">Pay out US$40.00</p>
        </div>
        <PinPad
          submitLabel="Done"
          clearLabel="Clear"
          backLabel="Back"
          onSubmit={(pin) => setLast(`${pin.length} digits submitted (not sent anywhere)`)}
        />
        <p className="helper center">{last ?? "Keys move every time. The PIN never leaves this phone."}</p>
      </div>
    </>
  );
}
