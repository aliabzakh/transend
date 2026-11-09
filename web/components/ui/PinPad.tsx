"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Delete, Eraser } from "lucide-react";
import { Button } from "./Button";

const CLEAR_AFTER_MS = 60_000;

function shuffledDigits(): string[] {
  const d = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  const buf = new Uint32Array(d.length);
  crypto.getRandomValues(buf);
  for (let i = d.length - 1; i > 0; i--) {
    const j = buf[i] % (i + 1);
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/**
 * Scrambled 3x4 keypad with masked dots. The key order changes every time the
 * pad is shown or submitted. The PIN lives only in this component's state: never
 * in a URL, log, analytics event or storage, and it clears itself after 60 s.
 */
export function PinPad({
  length = 4,
  submitLabel,
  clearLabel,
  backLabel,
  onSubmit,
  resetKey,
}: {
  length?: number;
  submitLabel: string;
  clearLabel: string;
  backLabel: string;
  onSubmit: (pin: string) => void;
  /** Change this to reset and rescramble the pad (for example between two PIN entries). */
  resetKey?: string | number;
}) {
  const [pin, setPin] = useState("");
  const [keys, setKeys] = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    setPin("");
    setKeys(shuffledDigits());
  }, []);

  // Scramble on the client only, so the order is never part of the server HTML.
  useEffect(() => {
    reset();
  }, [reset, resetKey]);

  // Auto-clear after 60 s of no activity.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (pin) timer.current = setTimeout(() => setPin(""), CLEAR_AFTER_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [pin]);

  const press = (d: string) => setPin((p) => (p.length < length ? p + d : p));
  const submit = () => {
    if (pin.length !== length) return;
    const value = pin;
    reset();
    onSubmit(value);
  };

  const digit = (d: string) => (
    <button key={d} type="button" className="pin-key" onClick={() => press(d)} aria-label={d}>
      {d}
    </button>
  );

  return (
    <div className="pin">
      <div className="pin-dots" aria-hidden>
        {Array.from({ length }).map((_, i) => (
          <span key={i} className="pin-dot" data-on={i < pin.length} />
        ))}
      </div>
      <div className="pin-grid">
        {keys.slice(0, 9).map(digit)}
        <button type="button" className="pin-key pin-key-small" onClick={() => setPin("")}>
          <Eraser className="icon" aria-hidden />
          <span>{clearLabel}</span>
        </button>
        {keys[9] ? digit(keys[9]) : <span />}
        <button
          type="button"
          className="pin-key pin-key-small"
          onClick={() => setPin((p) => p.slice(0, -1))}
        >
          <Delete className="icon" aria-hidden />
          <span>{backLabel}</span>
        </button>
      </div>
      <Button onClick={submit} disabled={pin.length !== length}>
        {submitLabel}
      </Button>
    </div>
  );
}
