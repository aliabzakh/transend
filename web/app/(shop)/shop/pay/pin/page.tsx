"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PinPad } from "@/components/ui/PinPad";
import { Screen } from "@/components/ui/Screen";
import { getPending, redeem, setLastResult } from "@/lib/demo/shop-engine";
import { s } from "@/strings/shop.en";

export default function PayPinPage() {
  const router = useRouter();
  const pending = getPending();

  useEffect(() => {
    if (!pending) router.replace("/shop/pay");
  }, [pending, router]);

  if (!pending) return null;

  return (
    <Screen title={s.pin.title}>
      <p className="lead">{s.pin.lead}</p>
      <PinPad
        submitLabel={s.pin.submit}
        clearLabel={s.pin.clear}
        backLabel={s.pin.back}
        onSubmit={(pin) => {
          const result = redeem({ ...pending, pin });
          setLastResult(result);
          router.push(result.ok ? "/shop/approved" : "/shop/declined");
        }}
      />
    </Screen>
  );
}
