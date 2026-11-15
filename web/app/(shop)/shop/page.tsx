"use client";

import { useState } from "react";
import { Ban, Banknote, CreditCard, MessageSquare, Scale, ShieldAlert, ShieldCheck, WifiOff, XCircle } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { Meter } from "@/components/ui/Meter";
import { Row } from "@/components/ui/Row";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusLine } from "@/components/ui/StatusLine";
import { setArea, useShop, type AreaStatus } from "@/lib/client/shop";
import { s } from "@/strings/shop.en";

const AREAS: AreaStatus[] = ["calm", "tense", "closed"];
const AREA_ICON = { calm: ShieldCheck, tense: ShieldAlert, closed: Ban } as const;

export default function ShopHome() {
  const { view, offline, refresh, setView } = useShop();
  const [error, setError] = useState(false);

  if (!view) {
    return (
      <Screen title={s.home.title}>
        {offline ? (
          <div className="notice notice-error">
            <StatusLine icon={WifiOff}>{s.signal}</StatusLine>
          </div>
        ) : (
          <>
            <Skeleton />
            <Skeleton kind="tall" />
            <Skeleton />
          </>
        )}
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
    <Screen eyebrow={s.home.title} title={view.shop.name}>
      {offline ? (
        <div className="notice notice-error">
          <StatusLine icon={WifiOff}>{s.signal}</StatusLine>
        </div>
      ) : null}
      <section className="stack-sm" aria-labelledby="area-h">
        <h2 id="area-h" className="section-label">
          {s.home.area}
        </h2>
        <div className="segmented" role="group" aria-labelledby="area-h">
          {AREAS.map((a) => {
            const Icon = AREA_ICON[a];
            return (
              <button
                key={a}
                type="button"
                className="seg"
                data-tone={a}
                aria-pressed={view.area.status === a}
                onClick={() => choose(a)}
              >
                <Icon className="icon" aria-hidden />
                {s.home.areaStatus[a]}
              </button>
            );
          })}
        </div>
        <p className="helper" aria-live="polite">
          {s.home.areaHint[view.area.status]}
        </p>
        {error ? (
          <div className="notice notice-error">
            <StatusLine icon={XCircle}>{s.home.areaError}</StatusLine>
          </div>
        ) : null}
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
        <Button variant="ghost" href="/shop/message" icon={MessageSquare}>
          {s.home.message}
        </Button>
      </div>

      <div className="card card-tight">
        <Row
          label={s.home.cashToday}
          value={s.home.cashOf(view.cashPaidTodayUsd.toFixed(2), view.ceilingUsd.toFixed(2))}
        />
        <Meter value={view.cashPaidTodayUsd} max={view.ceilingUsd} />
      </div>
    </Screen>
  );
}
