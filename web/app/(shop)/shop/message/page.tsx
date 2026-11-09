"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { StatusLine } from "@/components/ui/StatusLine";
import { s } from "@/strings/shop.en";

export default function MessagePage() {
  const [choice, setChoice] = useState<number | null>(null);
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <Screen title={s.message.sent} action={<Button href="/shop">{s.home.title}</Button>}>
        <StatusLine icon={CheckCircle2}>{s.message.sentLead}</StatusLine>
      </Screen>
    );
  }

  return (
    <Screen
      title={s.message.title}
      back={{ href: "/shop", label: s.back }}
      action={
        <Button icon={Send} disabled={choice === null} onClick={() => setSent(true)}>
          {s.message.send}
        </Button>
      }
    >
      <p>{s.message.lead}</p>
      <div className="stack" role="radiogroup" aria-label={s.message.title}>
        {s.message.options.map((text, i) => (
          <button
            key={text}
            type="button"
            role="radio"
            aria-checked={choice === i}
            className="seg"
            aria-pressed={choice === i}
            onClick={() => setChoice(i)}
          >
            {text}
          </button>
        ))}
      </div>
    </Screen>
  );
}
