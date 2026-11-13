"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, XCircle } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatusLine } from "@/components/ui/StatusLine";
import { addRecipient, issueCard } from "@/lib/client/sender";
import { ApiError } from "@/lib/client/api";
import { OPEN_DEPARTMENTS } from "@/lib/config";
import { s } from "@/strings/sender.en";

export default function NewRecipientPage() {
  const router = useRouter();
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // If the card step fails after the person was saved, retry the card only.
  const [savedId, setSavedId] = useState<string | null>(null);

  return (
    <Screen
      title={s.recipient.title}
      back={{ href: "/app", label: s.back }}
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        setError(null);
        setBlocked(false);
        try {
          const recipientId =
            savedId ??
            (
              await addRecipient({
                name: String(f.get("name") ?? "").trim(),
                relationship: String(f.get("relationship") ?? "").trim(),
                commune: String(f.get("commune") ?? "").trim(),
                department: String(f.get("department") ?? ""),
              })
            ).recipientId;
          setSavedId(recipientId);
          const cardId = await issueCard(recipientId);
          router.push(`/app/cards/${cardId}`);
        } catch (err) {
          const reason = err instanceof ApiError ? err.reason : "server_error";
          if (reason === "sanctioned") setBlocked(true);
          else if (reason === "card_exists" && err instanceof ApiError) {
            router.push(`/app/cards/${String(err.extra.cardId ?? "")}`);
            return;
          } else setError(s.recipient.errors[reason] ?? s.errors[reason] ?? s.errors.server_error);
          setBusy(false);
        }
      }}
      action={
        <Button type="submit" icon={UserPlus} disabled={busy}>
          {s.recipient.save}
        </Button>
      }
    >
      {blocked ? (
        <div className="notice">
          <StatusLine icon={XCircle}>{s.recipient.blocked}</StatusLine>
        </div>
      ) : null}
      {error ? (
        <div className="notice">
          <StatusLine icon={XCircle}>{error}</StatusLine>
        </div>
      ) : null}
      {busy ? <p className="muted">{s.recipient.working}</p> : null}
      <Input name="name" label={s.recipient.name} required disabled={!!savedId} />
      <Input
        name="relationship"
        label={s.recipient.relationship}
        hint={s.recipient.relationshipHint}
        required
        disabled={!!savedId}
      />
      <Input name="commune" label={s.recipient.commune} required disabled={!!savedId} />
      <Select name="department" label={s.recipient.department} hint={s.recipient.departmentHint} disabled={!!savedId}>
        {OPEN_DEPARTMENTS.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </Select>
    </Screen>
  );
}
