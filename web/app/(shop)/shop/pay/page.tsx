"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { currentLimitUsd, setPending, useShop } from "@/lib/demo/shop-engine";
import { isCardId, normalizeCode } from "@/lib/demo/codes";
import { s } from "@/strings/shop.en";
import { useState } from "react";

export default function PayPage() {
  const router = useRouter();
  const shop = useShop();
  const [bad, setBad] = useState(false);
  const limit = shop.area === "closed" ? 0 : currentLimitUsd();

  return (
    <Screen
      title={s.pay.title}
      back={{ href: "/shop", label: s.back }}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const cardId = String(f.get("card")).trim().toUpperCase();
        const line = Number(f.get("line"));
        const code = normalizeCode(String(f.get("code")));
        const amountUsd = Number(f.get("amount"));
        if (!isCardId(cardId) || !Number.isInteger(line) || code.length !== 12 || !(amountUsd > 0)) {
          setBad(true);
          return;
        }
        setPending({ cardId, line, code, amountUsd });
        router.push("/shop/pay/pin");
      }}
      action={
        <Button type="submit" icon={ArrowRight}>
          {s.pay.continue}
        </Button>
      }
    >
      <Input name="card" label={s.pay.cardId} mono autoCapitalize="characters" autoComplete="off" defaultValue="TS4F2K9Q" />
      <Input name="line" label={s.pay.line} hint={s.pay.lineHint} inputMode="numeric" autoComplete="off" />
      <Input name="code" label={s.pay.code} mono autoCapitalize="characters" autoComplete="off" maxLength={14} />
      <Input name="amount" label={s.pay.amount} hint={s.pay.limit(limit)} inputMode="decimal" autoComplete="off" />
      {bad ? <p role="alert">{s.pay.badInput}</p> : null}
      <p className="muted small">{s.pay.demoHint}</p>
    </Screen>
  );
}
