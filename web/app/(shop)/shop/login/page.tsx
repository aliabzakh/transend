"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, XCircle } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatusLine } from "@/components/ui/StatusLine";
import { shopLogIn } from "@/lib/client/shop";
import { ApiError } from "@/lib/client/api";
import { s } from "@/strings/shop.en";

export default function ShopLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Screen
      title={s.login.title}
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        setError(null);
        try {
          await shopLogIn(String(f.get("code") ?? ""), String(f.get("password") ?? ""));
          router.push("/shop");
        } catch (err) {
          setError(err instanceof ApiError && err.reason === "no_signal" ? s.signal : s.login.bad);
          setBusy(false);
        }
      }}
      action={
        <Button type="submit" icon={LogIn} disabled={busy}>
          {s.login.submit}
        </Button>
      }
    >
      {error ? <StatusLine icon={XCircle}>{error}</StatusLine> : null}
      <Input name="code" label={s.login.code} autoComplete="username" autoCapitalize="characters" required />
      <Input name="password" label={s.login.password} type="password" autoComplete="current-password" required />
      <p className="muted small">{s.login.demo}</p>
    </Screen>
  );
}
