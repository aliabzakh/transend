"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Phone, Play, XCircle } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { StatusLine } from "@/components/ui/StatusLine";
import { unfreezeCard, useMe } from "@/lib/client/sender";
import { ApiError } from "@/lib/client/api";
import { s } from "@/strings/sender.en";

export default function AlertPage() {
  const { id } = useParams<{ id: string }>();
  const { me, refresh } = useMe();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!me) {
    return (
      <Screen title="Alert" back={{ href: "/app", label: s.back }}>
        <p className="muted">{s.loading}</p>
      </Screen>
    );
  }
  const r = me.recipients.find((x) => x.card?.id === id);
  if (!r?.card) {
    return (
      <Screen title="Alert" back={{ href: "/app", label: s.back }}>
        <p>{s.errors.not_found}</p>
      </Screen>
    );
  }
  const held = r.card.status === "Frozen";
  return (
    <Screen
      title={s.alert.title(r.name)}
      back={{ href: "/app", label: s.back }}
      action={
        held ? (
          <Button
            icon={Play}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await unfreezeCard(r.card!.id);
                await refresh();
              } catch (e) {
                setError(s.errors[e instanceof ApiError ? e.reason : "server_error"] ?? s.errors.server_error);
              }
              setBusy(false);
            }}
          >
            {s.alert.unfreeze}
          </Button>
        ) : (
          <Button href="/app">{s.nav.home}</Button>
        )
      }
    >
      <StatusLine icon={held ? Phone : CheckCircle2}>{held ? s.alert.lead : s.alert.done}</StatusLine>
      {error ? <StatusLine icon={XCircle}>{error}</StatusLine> : null}
    </Screen>
  );
}
