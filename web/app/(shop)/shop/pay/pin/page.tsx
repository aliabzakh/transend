"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PinPad } from "@/components/ui/PinPad";
import { Screen } from "@/components/ui/Screen";
import { Rows, Row } from "@/components/ui/Row";
import { getPending, redeem, setLastCardId, setLastResult } from "@/lib/client/shop";
import { groupCode } from "@/lib/cards/format";
import { s } from "@/strings/shop.en";

/** Hand-over screen: she sees the amount she is approving, then enters her PIN. */
export default function PayPinPage() {
  const router = useRouter();
  const pending = getPending();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pending) router.replace("/shop/pay");
  }, [pending, router]);

  if (!pending) return null;

  return (
    <Screen title={s.pin.title}>
      <Rows>
        <Row label={s.pin.cardLine(pending.line)} value={<span className="mono">{groupCode(pending.code)}</span>} />
        <Row label={s.pin.approving(pending.amountUsd.toFixed(2))} value="" />
      </Rows>
      <p className="lead">{busy ? s.pin.working : s.pin.lead}</p>
      {busy ? null : (
        <PinPad
          submitLabel={s.pin.submit}
          clearLabel={s.pin.clear}
          backLabel={s.pin.back}
          onSubmit={async (pin) => {
            setBusy(true);
            const result = await redeem({ ...pending, pin });
            setLastResult(result);
            setLastCardId(pending.cardId);
            router.push(result.ok ? "/shop/approved" : "/shop/declined");
          }}
        />
      )}
      <p className="muted small">{s.pin.helper}</p>
    </Screen>
  );
}
