"use client";

import { useParams } from "next/navigation";
import { CheckCircle2, Phone, Play } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { StatusLine } from "@/components/ui/StatusLine";
import { unfreezeCard, useSender } from "@/lib/demo/sender-store";
import { s } from "@/strings/sender.en";

export default function AlertPage() {
  const { id } = useParams<{ id: string }>();
  const st = useSender();
  const card = st.cards.find((c) => c.id === id);
  const r = card ? st.recipients.find((x) => x.id === card.recipientId) : undefined;
  if (!card || !r) {
    return (
      <Screen title="Alert" back={{ href: "/app", label: s.back }}>
        <p>We could not find this card.</p>
      </Screen>
    );
  }
  const held = card.status === "Frozen";
  return (
    <Screen
      title={s.alert.title(r.name)}
      back={{ href: "/app", label: s.back }}
      action={
        held ? (
          <Button icon={Play} onClick={() => unfreezeCard(card.id)}>
            {s.alert.unfreeze}
          </Button>
        ) : (
          <Button href="/app">{s.nav.home}</Button>
        )
      }
    >
      <StatusLine icon={held ? Phone : CheckCircle2}>{held ? s.alert.lead : s.alert.done}</StatusLine>
    </Screen>
  );
}
