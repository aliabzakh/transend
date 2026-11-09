"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, XCircle } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatusLine } from "@/components/ui/StatusLine";
import { addRecipient } from "@/lib/demo/sender-store";
import { OPEN_DEPARTMENTS, type Department } from "@/lib/config";
import { isSanctioned } from "@/lib/sanctions";
import { s } from "@/strings/sender.en";

export default function NewRecipientPage() {
  const router = useRouter();
  const [blocked, setBlocked] = useState(false);

  return (
    <Screen
      title={s.recipient.title}
      back={{ href: "/app", label: s.back }}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const name = String(f.get("name") ?? "").trim();
        if (isSanctioned(name)) {
          setBlocked(true);
          return;
        }
        const { recipient } = addRecipient({
          name,
          relationship: String(f.get("relationship") ?? "").trim(),
          commune: String(f.get("commune") ?? "").trim(),
          department: String(f.get("department")) as Department,
        });
        router.push(`/app/cards/${recipient.cardId}`);
      }}
      action={
        <Button type="submit" icon={UserPlus}>
          {s.recipient.save}
        </Button>
      }
    >
      {blocked ? (
        <div className="notice">
          <StatusLine icon={XCircle}>{s.recipient.blocked}</StatusLine>
        </div>
      ) : null}
      <Input name="name" label={s.recipient.name} required />
      <Input
        name="relationship"
        label={s.recipient.relationship}
        hint={s.recipient.relationshipHint}
        required
      />
      <Input name="commune" label={s.recipient.commune} required />
      <Select name="department" label={s.recipient.department} hint={s.recipient.departmentHint}>
        {OPEN_DEPARTMENTS.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </Select>
    </Screen>
  );
}
