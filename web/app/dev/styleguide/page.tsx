import { notFound } from "next/navigation";
import { ArrowRight, BellRing, CheckCircle2, Clock, Send, XCircle } from "lucide-react";
import type { ShopForecastView } from "@/lib/server/forecast";
import { Amount } from "@/components/ui/Amount";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { HandOverIcon } from "@/components/ui/HandOverIcon";
import { AmountInput, Input, Select } from "@/components/ui/Input";
import { Logo } from "@/components/ui/Logo";
import { Meter } from "@/components/ui/Meter";
import { ReplyChip } from "@/components/ui/ReplyChip";
import { ResultMark } from "@/components/ui/ResultMark";
import { Row, Rows } from "@/components/ui/Row";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusLine } from "@/components/ui/StatusLine";
import { ForecastCard } from "@/components/ForecastCard";
import { StyleguidePin } from "./StyleguidePin";

export const metadata = { title: "Transend style guide" };

const COLOURS = [
  ["--color-bg", "Night"],
  ["--color-surface", "Canopy"],
  ["--color-surface-raise", "Canopy hover"],
  ["--color-surface-press", "Canopy pressed"],
  ["--color-fg", "Off-white"],
  ["--color-muted", "Muted"],
  ["--color-hint", "Hint"],
  ["--color-line", "Line"],
  ["--color-divider", "Divider"],
  ["--color-ring", "Ring"],
  ["--color-action", "Leaf"],
  ["--color-action-tint", "Leaf tint"],
  ["--color-highlight", "Gold"],
  ["--color-warn", "Clay"],
  ["--color-brand", "Forest"],
  ["--color-earth", "Earth"],
  ["--color-paper", "Cream"],
];

const TYPE = [
  ["--text-display", "You send C$200.00", 700],
  ["--text-receipt", "US$40.00", 700],
  ["--text-title", "Odette has the money", 700],
  ["--text-code", "QWCA 5KHE 7QET", 700],
  ["--text-button", "Send to Odette", 700],
  ["--text-lead", "Hand the phone to your customer", 500],
  ["--text-value", "Boutik Marie-Ange, Môle-Saint-Nicolas", 500],
  ["--text-label", "Left on card", 400],
  ["--text-caption", "Môle-Saint-Nicolas · card TS4F2K9Q", 400],
  ["--text-helper", "Keys move every time. The PIN never leaves this phone.", 400],
] as const;

/** Fixture for the forecast view (sample data shaped like ShopForecastView). */
function forecastFixture(): ShopForecastView {
  const start = Date.UTC(2026, 10, 1);
  const day = (i: number) => new Date(start + i * 86_400_000).toISOString().slice(0, 10);
  const wave = (i: number) => 60 + 30 * Math.sin(i / 1.6) + (i % 7 === 5 ? 45 : 0);
  return {
    shop: { id: "S-101", name: "Boutik Marie-Ange", ceilingCad: 288, hardCapCad: 500 },
    area: { name: "Môle-Saint-Nicolas", status: "calm" },
    last7Usd: 512.4,
    history: Array.from({ length: 14 }, (_, i) => ({ day: day(i), paidUsd: Math.round(wave(i)) })),
    days: Array.from({ length: 7 }, (_, k) => {
      const p50 = Math.round(wave(14 + k));
      return { day: day(14 + k), p10: Math.round(p50 * 0.6), p50, p90: Math.round(p50 * 1.5) };
    }),
    suggestedCeilingCad: 310,
    restock: [
      { day: day(15), windows: ["07:00-09:00"] },
      { day: day(19), windows: ["06:30-08:00", "13:00-14:00"] },
    ],
    reason: "Saturday market",
    forecaster: "model",
    modelVersion: "fixture",
  };
}

/** Every component in every state, on one page. Dev only: 404 in production. */
export default function StyleguidePage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="screen screen-wide">
      <div className="screen-head">
        <Logo />
        <h1 className="screen-title">Style guide</h1>
        <p className="muted">Draft A, Satoshi · Night market. Every value comes from styles/tokens.css.</p>
      </div>

      <section className="sg-section">
        <h2 className="section-title">Colour</h2>
        <div className="sg-swatches">
          {COLOURS.map(([token, name]) => (
            <div key={token} className="sg-swatch">
              <div className="sg-chip" style={{ background: `var(${token})` }} />
              <strong>{name}</strong>
              <span className="mono">{token}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="sg-section">
        <h2 className="section-title">Type: Satoshi 400 / 500 / 700</h2>
        {TYPE.map(([token, text, weight]) => (
          <div key={token}>
            <p className="sg-label mono">
              {token} · {weight}
            </p>
            <p className="tabular" style={{ fontSize: `var(${token})`, fontWeight: weight }}>
              {text}
            </p>
          </div>
        ))}
        <p className="eyebrow">Eyebrow · Gold label</p>
      </section>

      <section className="sg-section">
        <h2 className="section-title">Button</h2>
        <div className="sg-grid">
          {(["primary", "secondary", "ghost", "danger"] as const).map((v) => (
            <div key={v} className="sg-phone">
              <p className="sg-label">{v}: default, pressed, focus, disabled, busy</p>
              <Button variant={v} icon={Send}>
                Send to Odette
              </Button>
              <Button variant={v} className="sg-press">
                Pressed
              </Button>
              <Button variant={v} className="sg-focus">
                Focus
              </Button>
              <Button variant={v} disabled>
                Disabled
              </Button>
              <Button variant={v} busy>
                Sending...
              </Button>
            </div>
          ))}
          <div className="sg-phone">
            <p className="sg-label">big (shop home)</p>
            <Button big href="#" icon={ArrowRight}>
              Pay out
            </Button>
            <Button big variant="secondary" href="#" icon={ArrowRight}>
              Activate card
            </Button>
          </div>
        </div>
      </section>

      <section className="sg-section">
        <h2 className="section-title">Input</h2>
        <div className="sg-grid">
          <div className="sg-phone">
            <Input label="Card ID" hint="On the front of the card. Starts with TS." mono defaultValue="TS4F2K9Q" />
            <Input label="Focus (click me)" placeholder="Their full name" />
            <Input label="Error" defaultValue="TS4F" mono error="That card ID does not look right." />
            <Input label="Disabled" defaultValue="Odette Pierre" disabled />
          </div>
          <div className="sg-phone">
            <Select label="Department" hint="We are open in Nord-Ouest, Nord and Sud for now.">
              <option>Nord-Ouest</option>
              <option>Nord</option>
              <option>Sud</option>
            </Select>
            <AmountInput label="Amount in Canadian dollars" prefix="C$" defaultValue="200" inputMode="decimal" />
          </div>
        </div>
      </section>

      <section className="sg-section">
        <h2 className="section-title">Amount, Row, Card, Avatar, ReplyChip</h2>
        <div className="sg-grid">
          <div className="sg-phone">
            <Card variant="row">
              <Avatar name="Odette Pierre" />
              <div className="card-grow">
                <p className="card-name">Odette Pierre</p>
                <p className="card-sub">Môle-Saint-Nicolas · card TS4F2K9Q</p>
              </div>
            </Card>
            <div className="center">
              <p className="muted small">You send</p>
              <Amount value={200} currency="CAD" center />
            </div>
            <Rows>
              <Row label="She gets" value="US$137.39" />
              <Row label="Our fee" value="C$1.49" />
              <Row label="Rate" value="1 CAD = 0.6921 USD (demo rate)" />
            </Rows>
          </div>
          <div className="sg-phone">
            <Card variant="receipt">
              <Amount value={40} currency="USD" small center reveal />
              <hr className="divider" />
              <Rows plain>
                <Row label="Where" value="Boutik Marie-Ange, Môle-Saint-Nicolas" />
                <Row label="When" value="Today, 2:14 pm" />
                <Row label="Left on card" value="US$97.39" />
              </Rows>
            </Card>
            <ReplyChip from="From Odette" text="Received, thank you" />
          </div>
        </div>
      </section>

      <section className="sg-section">
        <h2 className="section-title">Status, notices, pills, marks</h2>
        <div className="sg-grid">
          <div className="sg-phone">
            <StatusLine icon={CheckCircle2} tone="ok">
              Approved
            </StatusLine>
            <StatusLine icon={XCircle} tone="warn">
              Declined: wrong PIN
            </StatusLine>
            <StatusLine icon={Clock} tone="info">
              Waiting to be activated
            </StatusLine>
            <div className="inline">
              <span className="pill pill-ok">Ready to use</span>
              <span className="pill pill-wait">Waiting</span>
              <span className="pill pill-warn">On hold</span>
              <span className="pill pill-muted">Replaced</span>
            </div>
          </div>
          <div className="sg-phone">
            <div className="notice">
              <StatusLine icon={BellRing}>A shop is asking to activate Odette&apos;s card.</StatusLine>
            </div>
            <div className="notice notice-error">
              <StatusLine icon={XCircle}>This quote has run out. Get a new one.</StatusLine>
            </div>
            <div className="notice notice-warn">
              <StatusLine icon={XCircle}>Please call Odette Pierre.</StatusLine>
            </div>
          </div>
          <div className="sg-phone">
            <div className="inline">
              <ResultMark kind="ok" />
              <ResultMark kind="fail" />
              <ResultMark kind="wait" />
              <span className="waiting" aria-hidden>
                <HandOverIcon className="icon" />
              </span>
            </div>
            <p className="sg-label">Meter: cash today (low, high, full) and the quote countdown</p>
            <Meter value={40} max={203} />
            <Meter value={170} max={203} />
            <Meter value={203} max={203} />
            <Meter value={8} max={30} countdown />
            <Skeleton label="Loading" />
            <Skeleton kind="line" />
          </div>
        </div>
      </section>

      <section className="sg-section">
        <h2 className="section-title">Area control, reply choices, PinPad</h2>
        <div className="sg-grid">
          <StyleguidePin />
        </div>
      </section>

      <section className="sg-section">
        <h2 className="section-title">Forecast view (fixture)</h2>
        <ForecastCard f={forecastFixture()} />
      </section>
    </main>
  );
}
