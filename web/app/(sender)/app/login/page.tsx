"use client";

import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { signUp } from "@/lib/demo/sender-store";
import { s } from "@/strings/sender.en";

export default function LoginPage() {
  const router = useRouter();
  return (
    <Screen
      title={s.auth.title}
      onSubmit={(e) => {
        e.preventDefault();
        signUp();
        router.push("/app/verify");
      }}
      action={
        <>
          <Button type="submit" icon={UserPlus}>
            {s.auth.create}
          </Button>
          <Button variant="secondary" href="/app">
            {s.auth.haveAccount}
          </Button>
        </>
      }
    >
      <p className="lead">{s.auth.lead}</p>
      <Input label={s.auth.email} type="email" autoComplete="email" required defaultValue="marie@example.com" />
      <Input
        label={s.auth.password}
        type="password"
        autoComplete="new-password"
        required
        defaultValue="demo-password"
      />
    </Screen>
  );
}
