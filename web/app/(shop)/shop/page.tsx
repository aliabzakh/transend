"use client";

import { Banknote, CreditCard, MessageSquare, Scale } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { setArea, setOffline, useShop } from "@/lib/demo/shop-engine";
import type { AreaStatus } from "@/lib/demo/areas";
import { s } from "@/strings/shop.en";

const AREAS: AreaStatus[] = ["calm", "tense", "closed"];

export default function ShopHome() {
  const shop = useShop();
  return (
    <Screen title={s.home.title}>
      <section className="stack" aria-labelledby="area-h">
        <h2 id="area-h" className="section-title">
          {s.home.area}
        </h2>
        <div className="segmented" role="group" aria-labelledby="area-h">
          {AREAS.map((a) => (
            <button
              key={a}
              type="button"
              className="seg"
              aria-pressed={shop.area === a}
              onClick={() => setArea(a)}
            >
              {s.home.areaStatus[a]}
            </button>
          ))}
        </div>
        <p className="muted">{s.home.areaHint[shop.area]}</p>
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

      <section className="panel">
        <h2 className="section-title">{s.home.demoTitle}</h2>
        <p className="muted small">
          {s.home.cashToday}: US${shop.cashPaidTodayUsd.toFixed(2)}
        </p>
        <label className="field-label">
          <input type="checkbox" checked={shop.offline} onChange={(e) => setOffline(e.target.checked)} />{" "}
          {s.home.demoOffline}
        </label>
      </section>
    </Screen>
  );
}
