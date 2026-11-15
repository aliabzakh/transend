"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PinPad } from "@/components/ui/PinPad";
import { Screen } from "@/components/ui/Screen";
import { HandOverIcon } from "@/components/ui/HandOverIcon";
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
    <Screen title={s.pin.title} titleIcon={HandOverIcon}>
      <div className="card card-tight handover">
        <p className="caption muted">{s.pin.cardLineReady(pending.line)}</p>
        <p className="code">{groupCode(pending.code)}</p>
        <p className="handover-amount">{s.pin.approving(pending.amountUsd.toFixed(2))}</p>
      </div>
      {busy ? (
        <div className="stack center">
          <span className="waiting" aria-hidden>
            <HandOverIcon className="icon" />
          </span>
          <p className="lead" role="status">
            {s.pin.working}
          </p>
        </div>
      ) : (
        <>
          <p className="small muted">{s.pin.lead}</p>
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
        </>
      )}
      <p className="helper center">{s.pin.helper}</p>
    </Screen>
  );
}
