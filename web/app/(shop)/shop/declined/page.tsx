"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, XCircle } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { StatusLine } from "@/components/ui/StatusLine";
import { getLastResult } from "@/lib/demo/shop-engine";
import { s } from "@/strings/shop.en";

export default function DeclinedPage() {
  const router = useRouter();
  const r = getLastResult();

  useEffect(() => {
    if (!r || r.ok) router.replace("/shop");
  }, [r, router]);
  if (!r || r.ok) return null;

  const reason = s.declined.reasons[r.reason];
  return (
    <Screen
      title={s.declined.title}
      action={
        <>
          <Button href="/shop/pay" icon={RotateCcw}>
            {s.declined.tryAgain}
          </Button>
          <Button href="/shop" variant="secondary">
            {s.home.title}
          </Button>
        </>
      }
    >
      <StatusLine icon={XCircle}>
        {s.declined.title}: {reason.why}
      </StatusLine>
      <p className="lead">{reason.what}</p>
      {r.reason === "no_signal" ? <p className="muted">{s.signal}</p> : null}
    </Screen>
  );
}
