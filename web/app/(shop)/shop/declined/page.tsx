"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, WifiOff } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { ResultMark } from "@/components/ui/ResultMark";
import { StatusLine } from "@/components/ui/StatusLine";
import { getLastResult } from "@/lib/client/shop";
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
      mark={<ResultMark kind="fail" />}
      title={s.declined.title}
      action={
        <>
          <Button href="/shop/pay" icon={RotateCcw}>
            {s.declined.tryAgain}
          </Button>
          <Button href="/shop" variant="ghost">
            {s.home.title}
          </Button>
        </>
      }
    >
      {/* The words carry the meaning; the Clay mark only repeats it. */}
      <div className="stack-sm" role="status">
        <p className="result-why">{reason.why}</p>
        <p className="lead muted">{reason.what}</p>
      </div>
      {r.reason === "no_signal" ? (
        <div className="notice">
          <StatusLine icon={WifiOff}>{s.signal}</StatusLine>
        </div>
      ) : null}
    </Screen>
  );
}
