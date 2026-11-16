"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowUpRight, Pause, Play, RotateCcw, X } from "lucide-react";
import { FLAT_CEILING_CAD, STEPS_PER_DAY, simulateWeek, stepToClock } from "@/lib/risk/simulate";
import type { OpsData, OpsShop } from "@/lib/server/ops";
import { ChartLegend, FanChart, WeekChart } from "./charts";
import { CASH_LABEL, cashState, clock, dayLong, dayShort, pct, usd, usdK, type CashState } from "./format";

// The map needs the browser (WebGL), so it is never server-rendered.
const OpsMap = dynamic(() => import("./OpsMap").then((m) => m.OpsMap), {
  ssr: false,
  loading: () => <div className="ops-map ops-map-loading">Loading satellite imagery…</div>,
});

const SPEEDS = [1, 3, 6, 12]; // simulated hours per second
type Filter = "all" | "real" | "simulated";

function StateChip({ state }: { state: CashState }) {
  return (
    <span className={`ops-state ops-state-${state}`}>
      <span className="ops-state-dot" aria-hidden="true" />
      {CASH_LABEL[state]}
    </span>
  );
}

function AreaChip({ status }: { status: OpsShop["status"] }) {
  if (status === "calm") return <span className="ops-area">Calm</span>;
  return <span className={`ops-area ops-area-${status}`}>{status === "tense" ? "Tense · limit US$50" : "Closed"}</span>;
}

function Tile({ label, value, sub, live }: { label: string; value: string; sub?: React.ReactNode; live?: boolean }) {
  return (
    <div className="ops-tile">
      <div className="ops-tile-label">
        {label}
        {live ? <span className="ops-live">at playhead</span> : null}
      </div>
      <div className="ops-tile-value">{value}</div>
      {sub ? <div className="ops-tile-sub">{sub}</div> : null}
    </div>
  );
}

function Mark() {
  return (
    <svg viewBox="0 0 96 96" className="ops-mark" aria-hidden="true">
      <circle cx="48" cy="27" r="15" fill="#E0A526" />
      <path d="M16 44 Q48 104 80 44" fill="none" stroke="#2FCB7A" strokeWidth="14" strokeLinecap="round" />
    </svg>
  );
}

export function OpsDashboard({ data }: { data: OpsData }) {
  const shops = data.shops;
  const days = shops[0].days.map((d) => d.day);
  const sim = useMemo(
    () =>
      simulateWeek(
        shops.map((s) => ({ id: s.id, status: s.status, days: s.days, restock: s.restock, hardCapCad: s.hardCapCad })),
        { floorCad: data.floorCad, cadToUsd: data.cadToUsd },
      ),
    [shops, data.floorCad, data.cadToUsd],
  );
  const simById = useMemo(() => new Map(sim.shops.map((s) => [s.id, s])), [sim]);

  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(3);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  // Start the playhead at the current time in Haiti when today is open for business.
  useEffect(() => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Port-au-Prince",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const date = `${get("year")}-${get("month")}-${get("day")}`;
    const di = days.indexOf(date);
    const min = Number(get("hour")) * 60 + Number(get("minute"));
    if (di >= 0 && min >= 6 * 60 && min < 20 * 60) setStep(di * STEPS_PER_DAY + (min - 6 * 60) / 15);
    // Once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Playback: advance the simulated clock, about 30 updates a second.
  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      acc += dt;
      if (acc >= 1 / 30) {
        const next = stepRef.current + acc * speed * 4;
        acc = 0;
        if (next >= sim.steps - 1) {
          setStep(sim.steps - 1);
          setPlaying(false);
          return;
        }
        setStep(next);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, sim.steps]);

  const togglePlay = useCallback(() => {
    if (stepRef.current >= sim.steps - 1) setStep(0);
    setPlaying((p) => !p);
  }, [sim.steps]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, select, textarea, button, [role=button]")) return;
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "Escape") setSelectedId(null);
      else if (e.key === "ArrowRight") setStep((s) => Math.min(sim.steps - 1, s + 4));
      else if (e.key === "ArrowLeft") setStep((s) => Math.max(0, s - 4));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, sim.steps]);

  const s = Math.min(sim.steps - 1, Math.floor(step));
  const now = stepToClock(s);
  const cashNow = sim.networkCash[s];
  const ceilingNow = sim.shops.reduce((a, x) => a + x.ceiling[s], 0);
  const topUpsDone = sim.topUps.filter((t) => t.endStep <= step).length;
  const toppingUp = sim.topUps.filter((t) => t.startStep <= step && t.endStep > step).length;
  const states = shops.map((sh) => {
    const ss = simById.get(sh.id)!;
    return cashState(sh.status, ss.ceiling[s] > 0 ? ss.cash[s] / ss.ceiling[s] : 0);
  });
  const lowCount = states.filter((x) => x === "low" || x === "out").length;

  const sumBy = (k: "p10" | "p50" | "p90") => shops.reduce((a, sh) => a + sh.days.reduce((b, d) => b + d[k], 0), 0);
  const fc = { p10: sumBy("p10"), p50: sumBy("p50"), p90: sumBy("p90") };
  const cashCut = sim.flat.avgCashUsd > 0 ? 100 * (1 - sim.totals.avgCashUsd / sim.flat.avgCashUsd) : 0;

  // Network history: only days every shop reported, so the line never dips for missing data.
  const netHistory = useMemo(() => {
    const m = new Map<string, { n: number; v: number }>();
    for (const sh of shops) for (const h of sh.history) {
      const e = m.get(h.day) ?? { n: 0, v: 0 };
      m.set(h.day, { n: e.n + 1, v: e.v + h.paidUsd });
    }
    return [...m.entries()].filter(([, e]) => e.n === shops.length).sort(([a], [b]) => a.localeCompare(b)).map(([day, e]) => ({ day, paidUsd: e.v }));
  }, [shops]);
  const netForecast = days.map((day, i) => ({
    day,
    p10: shops.reduce((a, sh) => a + sh.days[i].p10, 0),
    p50: shops.reduce((a, sh) => a + sh.days[i].p50, 0),
    p90: shops.reduce((a, sh) => a + sh.days[i].p90, 0),
  }));

  const visible = shops
    .map((sh, i) => ({ sh, state: states[i] }))
    .filter(({ sh }) => filter === "all" || (filter === "real" ? !sh.simulated : sh.simulated));
  const selected = shops.find((x) => x.id === selectedId) ?? null;
  const realCount = shops.filter((x) => !x.simulated).length;

  return (
    <div className="ops">
      <header className="ops-head">
        <div className="ops-brand">
          <Link href="/" className="ops-brand-home" aria-label="Transend home">
            <Mark />
            <span className="ops-brand-word">Transend</span>
          </Link>
          <span className="ops-brand-sep" aria-hidden="true" />
          <span className="ops-brand-title">Cash operations · Haiti</span>
        </div>
        <div className="ops-head-meta">
          <span className="ops-flag">Sample data</span>
          <span className="ops-flag ops-flag-quiet">
            {realCount} real shops · {shops.length - realCount} simulated
          </span>
          <span className="ops-head-range">
            Forecast week {dayLong(days[0])} – {dayLong(days[days.length - 1])}
          </span>
          <Link href="/proof" className="ops-head-link">
            Contract proof <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <aside className="ops-left" aria-label="Network">
        <section>
          <h2 className="ops-h">
            Network at {dayShort(days[now.day])} {clock(now.hh, now.mm)}
          </h2>
          <div className="ops-tiles">
            <Tile label="Cash in shops" value={usdK(cashNow)} sub={`of ${usdK(ceilingNow)} in ceilings`} live />
            <Tile label="Paid out this week" value={usdK(sim.networkPaid[s])} sub={`of ${usdK(sim.totals.demandUsd)} simulated demand`} live />
            <Tile label="Shop top-ups" value={`${topUpsDone} / ${sim.topUps.length}`} sub={`${toppingUp} topping up now`} live />
            <Tile label="Shops low on cash" value={String(lowCount)} sub={`of ${shops.length} shops`} live />
          </div>
        </section>

        <section>
          <h2 className="ops-h">Next 7 days</h2>
          <div className="ops-tiles">
            <Tile label="Expected payouts" value={usdK(fc.p50)} sub={`${usdK(fc.p10)} – ${usdK(fc.p90)} (p10–p90)`} />
            <Tile
              label="Payouts served"
              value={pct(sim.totals.servedPct)}
              sub={`Flat C$${FLAT_CEILING_CAD} ceiling: ${pct(sim.flat.servedPct)}`}
            />
            <Tile
              label="Average cash held"
              value={usdK(sim.totals.avgCashUsd)}
              sub={`${cashCut >= 0 ? "−" : "+"}${Math.abs(cashCut).toFixed(0)}% vs flat C$${FLAT_CEILING_CAD} (${usdK(sim.flat.avgCashUsd)})`}
            />
            <Tile label="Payouts redirected" value={usd(sim.totals.redirectedUsd)} sub={`${sim.totals.shopDaysRedirected} shop-days sent to the next shop`} />
          </div>
        </section>

        <section>
          <h2 className="ops-h">Network payouts, US$ a day</h2>
          <ChartLegend
            items={[
              { key: "a", label: "Paid out", kind: "line" },
              { key: "f", label: "Forecast", kind: "band" },
            ]}
          />
          <FanChart history={netHistory} forecast={netForecast} height={150} title="Network daily payouts and forecast" />
          <p className="ops-note">Forecast bands are the sum of each shop&apos;s band.</p>
        </section>

        <section className="ops-shops">
          <div className="ops-h-row">
            <h2 className="ops-h">Shops</h2>
            <div className="ops-seg" role="group" aria-label="Show shops">
              {(["all", "real", "simulated"] as Filter[]).map((f) => (
                <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                  {f === "all" ? "All" : f === "real" ? "Real" : "Simulated"}
                </button>
              ))}
            </div>
          </div>
          <table className="ops-table">
            <thead>
              <tr>
                <th scope="col">Shop</th>
                <th scope="col">Cash vs ceiling</th>
                <th scope="col" className="num">
                  Today
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map(({ sh, state }) => {
                const ss = simById.get(sh.id)!;
                const frac = ss.ceiling[s] > 0 ? Math.min(1, ss.cash[s] / ss.ceiling[s]) : 0;
                return (
                  <tr
                    key={sh.id}
                    aria-selected={sh.id === selectedId}
                    onClick={() => setSelectedId(sh.id === selectedId ? null : sh.id)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setSelectedId(sh.id);
                    }}
                  >
                    <th scope="row">
                      <span className="ops-shop-name">
                        {sh.name}
                        {!sh.simulated ? <span className="ops-real">Real</span> : null}
                      </span>
                      <span className="ops-shop-sub">
                        {sh.commune}
                        {sh.status !== "calm" ? ` · ${sh.status}` : ""}
                      </span>
                    </th>
                    <td>
                      <div className={`ops-bar ops-bar-${state}`}>
                        <span style={{ width: `${frac * 100}%` }} />
                      </div>
                      <span className="ops-bar-label">
                        {usd(ss.cash[s])} · {CASH_LABEL[state]}
                      </span>
                    </td>
                    <td className="num">{usd(sh.days[now.day].p50)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="ops-note">
            Simulated shops are made-up shops in real towns, on synthetic payouts. Real shops read the database and
            the testnet contract{data.realSource === "fallback" ? " (database not reachable: showing their sample data)" : ""}.
            No cash is delivered: each shopkeeper tops up her own cash from her sales or her MonCash or Fonkoze
            account, at times that change every day, and is paid back digitally after each payout.
          </p>
        </section>
      </aside>

      <main className="ops-center">
        <OpsMap shops={shops} sim={sim} step={step} selectedId={selectedId} onSelect={setSelectedId} />
        <div className="ops-map-legend" aria-label="Map key">
          <span>
            <span className="ops-key-pin" /> Shop: ring is cash vs ceiling
          </span>
          <span>
            <span className="ops-key-pin ops-key-real" /> Real shop
          </span>
          <span>
            <span className="ops-key-topup" /> Shopkeeper topping up her cash
          </span>
        </div>
        {selected ? (
          <button type="button" className="ops-map-back" onClick={() => setSelectedId(null)}>
            <RotateCcw size={14} aria-hidden="true" /> Whole network
          </button>
        ) : null}
      </main>

      <aside className="ops-right" aria-label={selected ? selected.name : "Forecast model"}>
        {selected ? (
          <ShopDetail
            shop={selected}
            sim={simById.get(selected.id)!}
            topUps={sim.topUps.filter((t) => t.shopId === selected.id)}
            days={days}
            step={step}
            onClose={() => setSelectedId(null)}
            onScrub={(v) => {
              setPlaying(false);
              setStep(v);
            }}
            state={states[shops.indexOf(selected)]}
          />
        ) : (
          <Overview data={data} sim={sim} step={step} onSelect={setSelectedId} />
        )}
      </aside>

      <footer className="ops-timeline">
        <div className="ops-controls">
          <button type="button" className="ops-play" onClick={togglePlay} aria-label={playing ? "Pause" : "Play the week"}>
            {playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
          </button>
          <div className="ops-clock">
            <span className="ops-clock-day">{dayLong(days[now.day])}</span>
            <span className="ops-clock-time">{clock(now.hh, now.mm)}</span>
          </div>
          <div className="ops-seg" role="group" aria-label="Playback speed">
            {SPEEDS.map((v) => (
              <button key={v} type="button" aria-pressed={speed === v} onClick={() => setSpeed(v)}>
                {v}h/s
              </button>
            ))}
          </div>
        </div>
        <div className="ops-timeline-chart">
          <WeekChart
            cash={sim.networkCash}
            ceiling={sim.shops[0].ceiling.map((_, i) => sim.shops.reduce((a, x) => a + x.ceiling[i], 0))}
            days={days}
            step={step}
            arrivals={sim.topUps.map((t) => t.endStep)}
            height={96}
            title="Cash across the network over the simulated week. Drag to move the playhead."
            onScrub={(v) => {
              setPlaying(false);
              setStep(v);
            }}
          />
        </div>
      </footer>
    </div>
  );
}

function Overview({
  data,
  sim,
  step,
  onSelect,
}: {
  data: OpsData;
  sim: ReturnType<typeof simulateWeek>;
  step: number;
  onSelect: (id: string) => void;
}) {
  const m = data.model;
  const s = Math.min(sim.steps - 1, Math.floor(step));
  const day = stepToClock(s).day;
  const watch = data.shops.filter((x) => x.status !== "calm");
  const departments = [...new Set(data.shops.map((x) => x.department))];
  return (
    <>
      <section>
        <h2 className="ops-h">Forecast model</h2>
        {m ? (
          <>
            <div className="ops-model-head">
              <span className="ops-model-name">Gradient-boosted quantile regression</span>
              <span className="ops-chip">{m.version}</span>
              <span className={`ops-chip ${m.live ? "ops-chip-on" : ""}`}>{m.live ? "Live" : "Rules live"}</span>
            </div>
            <dl className="ops-dl">
              <div>
                <dt>Error on held-out days</dt>
                <dd>
                  {usd(m.modelMae)} a day <span className="muted">vs {usd(m.baselineMae)} for the rules</span>
                </dd>
              </div>
              <div>
                <dt>Better than the rules by</dt>
                <dd>{m.improvementPct.toFixed(0)}% (needs 10% to go live)</dd>
              </div>
              <div>
                <dt>Days inside the p10–p90 band</dt>
                <dd>{m.coverage !== null ? `${Math.round(m.coverage * 100)}% (target 80%)` : "n/a"}</dd>
              </div>
              <div>
                <dt>Trained on</dt>
                <dd>{m.trainedOn}</dd>
              </div>
            </dl>
            <p className="ops-note">
              Inputs: day of week, day of month, top-up and school-fee calendar, area status, last week&apos;s payouts and
              money waiting on nearby cards. No names or personal data. The forecast sets each shop&apos;s cash ceiling
              between C${data.floorCad} and the hard cap, and its restock windows. It never approves or refuses a payout.
            </p>
          </>
        ) : (
          <p className="ops-note">No trained model: the rules baseline is live.</p>
        )}
      </section>

      <section>
        <h2 className="ops-h">Departments, {dayShort(data.shops[0].days[day].day)}</h2>
        <table className="ops-table ops-table-plain">
          <thead>
            <tr>
              <th scope="col">Department</th>
              <th scope="col" className="num">
                Shops
              </th>
              <th scope="col" className="num">
                Top-ups today
              </th>
              <th scope="col" className="num">
                Topped up
              </th>
            </tr>
          </thead>
          <tbody>
            {departments.map((dep) => {
              const ids = new Set(data.shops.filter((x) => x.department === dep).map((x) => x.id));
              const today = sim.topUps.filter((t) => ids.has(t.shopId) && t.day === day);
              const done = today.filter((t) => t.endStep <= step);
              return (
                <tr key={dep}>
                  <th scope="row">{dep}</th>
                  <td className="num">{ids.size}</td>
                  <td className="num">
                    {done.length} / {today.length}
                  </td>
                  <td className="num">{usd(done.reduce((a, t) => a + t.amountUsd, 0))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="ops-note">
          Shopkeepers top up their own payout cash from sales or their MonCash or Fonkoze account. There are no cash
          deliveries to rob, and top-up times change every day.
        </p>
      </section>

      {watch.length ? (
        <section>
          <h2 className="ops-h">Areas on watch</h2>
          <ul className="ops-watch">
            {watch.map((x) => (
              <li key={x.id}>
                <button type="button" onClick={() => onSelect(x.id)}>
                  <span>
                    {x.commune} <span className="muted">· {x.name}</span>
                  </span>
                  <AreaChip status={x.status} />
                </button>
              </li>
            ))}
          </ul>
          <p className="ops-note">A tense area drops the payout limit to US$50 and the forecast expects less demand.</p>
        </section>
      ) : null}
      <p className="ops-hint">Select a shop on the map or in the list for its forecast and cash plan.</p>
    </>
  );
}

function ShopDetail({
  shop,
  sim,
  topUps,
  days,
  step,
  state,
  onClose,
  onScrub,
}: {
  shop: OpsShop;
  sim: ReturnType<typeof simulateWeek>["shops"][number];
  topUps: ReturnType<typeof simulateWeek>["topUps"];
  days: string[];
  step: number;
  state: CashState;
  onClose: () => void;
  onScrub: (s: number) => void;
}) {
  const s = Math.min(sim.cash.length - 1, Math.floor(step));
  const day = stepToClock(s).day;
  const bt = shop.backtest;
  const inBand = bt.filter((b) => b.actual >= b.p10 && b.actual <= b.p90).length;
  const mae = bt.length ? bt.reduce((a, b) => a + Math.abs(b.actual - b.p50), 0) / bt.length : 0;
  return (
    <>
      <div className="ops-detail-head">
        <div>
          <h2 className="ops-detail-name">
            {shop.name} {shop.simulated ? <span className="ops-chip">Simulated</span> : <span className="ops-real">Real</span>}
          </h2>
          <p className="ops-detail-sub">
            {shop.id} · {shop.commune}, {shop.department}
          </p>
        </div>
        <button type="button" className="ops-icon-btn" onClick={onClose} aria-label="Close shop">
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="ops-detail-chips">
        <StateChip state={state} />
        <AreaChip status={shop.status} />
        <span className="ops-chip">Forecast: {shop.forecaster === "model" ? "trained model" : "rules"}</span>
      </div>

      <div className="ops-tiles ops-tiles-3">
        <Tile label="Cash now" value={usd(sim.cash[s])} sub={`of ${usd(sim.ceiling[s])} ceiling`} live />
        <Tile label={`Ceiling ${dayShort(days[day])}`} value={`C$${sim.days[day].ceilingCad}`} sub={`cap C$${shop.hardCapCad}`} />
        <Tile label="Paid, last 7 days" value={usd(shop.last7Usd)} sub={`ceiling set now C$${shop.ceilingCadNow}`} />
      </div>
      <p className="ops-reason">{shop.reason}</p>

      <section>
        <h3 className="ops-h">Payouts, US$ a day</h3>
        <ChartLegend
          items={[
            { key: "a", label: "Paid out", kind: "line" },
            { key: "b", label: "Backtest band", kind: "muted-band" },
            { key: "f", label: "Forecast p50, p10–p90", kind: "band" },
          ]}
        />
        <FanChart history={shop.history} backtest={bt} forecast={shop.days} title={`${shop.name}: daily payouts, backtest and forecast`} />
        {bt.length ? (
          <p className="ops-note">
            Backtest over the last {bt.length} days, each forecast made only from earlier days: {inBand} of {bt.length} inside the band,
            average error {usd(mae)} a day.
          </p>
        ) : null}
      </section>

      <section>
        <h3 className="ops-h">Cash in the shop, simulated week</h3>
        <ChartLegend
          items={[
            { key: "c", label: "Cash on hand", kind: "line" },
            { key: "l", label: "Ceiling", kind: "ceiling" },
            { key: "t", label: "Top-up done", kind: "tick" },
          ]}
        />
        <WeekChart
          cash={sim.cash}
          ceiling={sim.ceiling}
          days={days}
          step={step}
          arrivals={topUps.map((t) => t.endStep)}
          height={118}
          onScrub={onScrub}
          title={`${shop.name}: cash on hand over the simulated week`}
        />
      </section>

      <section>
        <h3 className="ops-h">Plan</h3>
        <table className="ops-table ops-table-plain">
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col" className="num">
                Likely
              </th>
              <th scope="col" className="num">
                p10–p90
              </th>
              <th scope="col" className="num">
                Ceiling
              </th>
              <th scope="col">Restock</th>
            </tr>
          </thead>
          <tbody>
            {shop.days.map((d, i) => (
              <tr key={d.day} aria-current={i === day ? "date" : undefined}>
                <th scope="row">{dayShort(d.day)}</th>
                <td className="num">{usd(d.p50)}</td>
                <td className="num muted">
                  {Math.round(d.p10)}–{Math.round(d.p90)}
                </td>
                <td className="num">C${sim.days[i].ceilingCad}</td>
                <td className="mono">{shop.status === "closed" ? "Paused" : shop.restock[i]?.windows.join("  ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
