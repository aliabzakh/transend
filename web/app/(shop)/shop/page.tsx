"use client";

import { useState } from "react";
import { Banknote, CreditCard, MessageSquare, Scale, WifiOff, XCircle } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { StatusLine } from "@/components/ui/StatusLine";
import { setArea, useShop, type AreaStatus } from "@/lib/client/shop";
import { s } from "@/strings/shop.en";

const AREAS: AreaStatus[] = ["calm", "tense", "closed"];

export default function ShopHome() {
  const { view, offline, refresh, setView } = useShop();
  const [error, setError] = useState(false);

  if (!view) {
    return (
      <Screen title={s.home.title}>
        {offline ? <StatusLine icon={WifiOff}>{s.signal}</StatusLine> : null}
      </Screen>
    );
  }

  const choose = async (a: AreaStatus) => {
    setError(false);
    const before = view;
    setView({ ...view, area: { ...view.area, status: a } }); // one tap shows at once
    try {
      await setArea(view.area.id, a);
      await refresh();
    } catch {
      setView(before);
      setError(true);
    }
  };

  return (
    <Screen title={view.shop.name}>
      {offline ? <StatusLine icon={WifiOff}>{s.signal}</StatusLine> : null}
      <section className="stack" aria-labelledby="area-h">
        <h2 id="area-h" className="section-title">
          {s.home.area}
        </h2>
        <div className="segmented" role="group" aria-labelledby="area-h">
          {AREAS.map((a) => (
            <button key={a} type="button" className="seg" aria-pressed={view.area.status === a} onClick={() => choose(a)}>
              {s.home.areaStatus[a]}
            </button>
          ))}
        </div>
        <p className="muted">{s.home.areaHint[view.area.status]}</p>
        {error ? <StatusLine icon={XCircle}>{s.home.areaError}</StatusLine> : null}
      </section>

      <div className="stack">
        <Button big href="/shop/pay" icon={Banknote}>
          {s.home.payOut}
        </Button>
        <Button big variant="secondary" href="/shop/activate" icon={CreditCard}>
          {s.home.activate}
        </Button>
        <Button big variant="secondary" href="/shop/balance" icon={Scale}>
          {s.home.balance}
        </Button>
        <Button variant="secondary" href="/shop/message" icon={MessageSquare}>
          {s.home.message}
        </Button>
      </div>

      <p className="muted small">
        {s.home.ceiling(view.cashPaidTodayUsd.toFixed(2), view.ceilingUsd.toFixed(2))}
      </p>
    </Screen>
  );
}
