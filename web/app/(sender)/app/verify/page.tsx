"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, XCircle } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatusLine } from "@/components/ui/StatusLine";
import { verifyIdentity } from "@/lib/demo/sender-store";
import { isSanctioned } from "@/lib/sanctions";
import { s } from "@/strings/sender.en";

export default function VerifyPage() {
  const router = useRouter();
  const [blocked, setBlocked] = useState(false);

  return (
    <Screen
      title={s.verify.title}
      onSubmit={(e) => {
        e.preventDefault();
        const name = String(new FormData(e.currentTarget).get("name") ?? "");
        if (isSanctioned(name)) {
          setBlocked(true);
          return;
        }
        verifyIdentity();
        router.push("/app");
      }}
      action={
        <Button type="submit" icon={ShieldCheck}>
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
      <Input name="name" label={s.verify.name} required autoComplete="name" defaultValue="Marie Joseph" />
      <Input name="dob" label={s.verify.dob} type="date" required defaultValue="1988-04-12" />
      <Input name="id" label={s.verify.id} type="file" accept="image/*" hint={s.verify.idHint} />
    </Screen>
  );
}
