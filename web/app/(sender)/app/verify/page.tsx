"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, XCircle } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatusLine } from "@/components/ui/StatusLine";
import { verifyIdentity } from "@/lib/client/sender";
import { ApiError } from "@/lib/client/api";
import { s } from "@/strings/sender.en";

export default function VerifyPage() {
  const router = useRouter();
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Screen
      title={s.verify.title}
      onSubmit={async (e) => {
        e.preventDefault();
        // Only the name is sent. The ID photo stays in the browser and is never uploaded.
        const name = String(new FormData(e.currentTarget).get("name") ?? "");
        setBusy(true);
        setError(null);
        try {
          await verifyIdentity(name);
          router.push("/app");
        } catch (err) {
          const reason = err instanceof ApiError ? err.reason : "server_error";
          if (reason === "sanctioned") setBlocked(true);
          else if (reason === "not_signed_in") router.replace("/app/login");
          else setError(s.errors[reason] ?? s.errors.server_error);
          setBusy(false);
        }
      }}
      action={
        <Button type="submit" icon={ShieldCheck} disabled={busy}>
          {s.verify.continue}
        </Button>
      }
    >
      <p>{s.verify.lead}</p>
      {blocked ? (
        <div className="notice">
          <StatusLine icon={XCircle}>{s.verify.blockedTitle}</StatusLine>
          <p>{s.verify.blocked}</p>
        </div>
      ) : null}
      {error ? <StatusLine icon={XCircle}>{error}</StatusLine> : null}
      <Input name="name" label={s.verify.name} required autoComplete="name" />
      <Input name="dob" label={s.verify.dob} type="date" required />
      <Input name="id" label={s.verify.id} type="file" accept="image/*" hint={s.verify.idHint} />
    </Screen>
  );
}
