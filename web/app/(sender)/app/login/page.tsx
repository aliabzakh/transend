"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, UserPlus, XCircle } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatusLine } from "@/components/ui/StatusLine";
import { logIn, signUp } from "@/lib/client/sender";
import { ApiError } from "@/lib/client/api";
import { s } from "@/strings/sender.en";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "login">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Screen
      title={mode === "signup" ? s.auth.title : s.auth.loginTitle}
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const email = String(f.get("email") ?? "");
        const password = String(f.get("password") ?? "");
        setBusy(true);
        setError(null);
        try {
          if (mode === "signup") {
            await signUp(email, password);
            router.push("/app/verify");
          } else {
            const { verified } = await logIn(email, password);
            router.push(verified ? "/app" : "/app/verify");
          }
        } catch (err) {
          const reason = err instanceof ApiError ? err.reason : "server_error";
          setError(s.auth.errors[reason] ?? s.errors[reason] ?? s.errors.server_error);
          setBusy(false);
        }
      }}
      action={
        <>
          <Button type="submit" icon={mode === "signup" ? UserPlus : LogIn} disabled={busy}>
            {mode === "signup" ? s.auth.create : s.auth.login}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setError(null);
              setMode(mode === "signup" ? "login" : "signup");
            }}
            disabled={busy}
          >
            {mode === "signup" ? s.auth.haveAccount : s.auth.newAccount}
          </Button>
        </>
      }
    >
      <p className="lead">{s.auth.lead}</p>
      {error ? (
        <div className="notice">
          <StatusLine icon={XCircle}>{error}</StatusLine>
        </div>
      ) : null}
      {busy && mode === "signup" ? <p className="muted">{s.auth.working}</p> : null}
      <Input name="email" label={s.auth.email} type="email" autoComplete="email" required />
      <Input
        name="password"
        label={s.auth.password}
        type="password"
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        minLength={8}
        required
      />
      {mode === "login" ? <p className="muted small">{s.auth.demo}</p> : null}
    </Screen>
  );
}
