"use client";

import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { login } from "@/lib/demo/shop-engine";
import { s } from "@/strings/shop.en";

export default function ShopLoginPage() {
  const router = useRouter();
  return (
    <Screen
      title={s.login.title}
      onSubmit={(e) => {
        e.preventDefault();
        login();
        router.push("/shop");
      }}
      action={
        <Button type="submit" icon={LogIn}>
          {s.login.submit}
        </Button>
      }
    >
      <Input label={s.login.code} defaultValue="S-101" autoComplete="username" required />
      <Input label={s.login.password} type="password" defaultValue="demo" autoComplete="current-password" required />
      <p className="muted small">{s.login.demo}</p>
    </Screen>
  );
}
