"use client";

import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { ForecastDay } from "@/lib/risk/forecast";
import { STEPS_PER_DAY, stepToClock } from "@/lib/risk/simulate";
import type { BacktestDay } from "@/lib/server/ops";
import { clock, dayDate, dayLong, dayShort, usd } from "./format";

/** Width of an element, kept in sync with its size. */
export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

const niceMax = (v: number) => {
  if (v <= 0) return 10;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
};
const isNice = (v: number) => {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  return [1, 2, 2.5, 5, 10].some((n) => Math.abs(v / p - n) < 1e-9);
};
/** Gridlines at round values: the first count (from `prefer`) that splits max into nice steps. */
const ticks = (max: number, prefer = [4, 5, 3, 2]) => {
  const count = prefer.find((c) => isNice(max / c)) ?? prefer[0];
  return Array.from({ length: count + 1 }, (_, i) => (max / count) * i);
};
const axisUsd = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : String(Math.round(v)));

function areaPath(pts: { x: number; lo: number; hi: number }[]) {
  if (!pts.length) return "";
  const top = pts.map((p, i) => `${i ? "L" : "M"}${p.x},${p.hi}`).join("");
  const bottom = [...pts].reverse().map((p) => `L${p.x},${p.lo}`).join("");
  return `${top}${bottom}Z`;
}
const linePath = (pts: { x: number; y: number }[]) => pts.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join("");

type Legend = { key: string; label: string; kind: "line" | "band" | "muted-line" | "muted-band" | "ceiling" | "tick" }[];

export function ChartLegend({ items }: { items: Legend }) {
  return (
    <ul className="ops-legend">
      {items.map((i) => (
        <li key={i.key}>
          <span className={`ops-swatch ops-swatch-${i.kind}`} aria-hidden="true" />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/**
 * Daily payouts: actual history, one-day-ahead backtest band (each made only from earlier days)
 * and the 7-day forecast band. One y-axis, US$ a day.
 */
export function FanChart({
  history,
  backtest = [],
  forecast,
  height = 180,
  title,
}: {
  history: { day: string; paidUsd: number }[];
  backtest?: BacktestDay[];
  forecast: ForecastDay[];
  height?: number;
  title: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 36, r: 8, t: 14, b: 22 };
  const start = dayDate(history[0]?.day ?? forecast[0].day).getTime();
  const end = dayDate(forecast[forecast.length - 1].day).getTime();
  const span = Math.max(1, (end - start) / 86_400_000);
  const W = Math.max(0, width);
  const x = (iso: string) => pad.l + (((dayDate(iso).getTime() - start) / 86_400_000) / span) * (W - pad.l - pad.r);
  const max = niceMax(
    Math.max(...history.map((h) => h.paidUsd), ...forecast.map((f) => f.p90), ...backtest.map((b) => b.p90)) * 1.05,
  );
  const y = (v: number) => pad.t + (1 - v / max) * (height - pad.t - pad.b);

  // Every day on the chart, for hover.
  const days = [...new Set([...history.map((h) => h.day), ...forecast.map((f) => f.day)])].sort();
  const byDay = (d: string) => ({
    actual: history.find((h) => h.day === d)?.paidUsd,
    back: backtest.find((b) => b.day === d),
    fc: forecast.find((f) => f.day === d),
  });
  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    let best = 0;
    days.forEach((d, i) => {
      if (Math.abs(x(d) - px) < Math.abs(x(days[best]) - px)) best = i;
    });
    setHover(best);
  };
  const xTicks = days.filter((_, i) => i % 7 === (days.length - 1) % 7);
  const h = hover !== null ? days[hover] : null;
  const hv = h ? byDay(h) : null;
  const todayX = x(forecast[0].day);

  return (
    <div className="ops-chart" ref={ref}>
      {W > 0 ? (
        <svg width={W} height={height} role="img" aria-label={title} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
          {ticks(max).map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="ops-grid" />
              <text x={pad.l - 6} y={y(t) + 4} className="ops-axis" textAnchor="end">
                {axisUsd(t)}
              </text>
            </g>
          ))}
          {xTicks.map((d) => (
            <text key={d} x={x(d)} y={height - 6} className="ops-axis" textAnchor="middle">
              {dayShort(d)}
            </text>
          ))}
          <rect x={todayX - 4} y={pad.t} width={W - pad.r - todayX + 4} height={height - pad.t - pad.b} className="ops-future" />
          <line x1={todayX - 4} x2={todayX - 4} y1={pad.t - 4} y2={height - pad.b} className="ops-today" />
          <text x={todayX} y={pad.t - 4} className="ops-axis ops-axis-strong">
            Forecast
          </text>
          {backtest.length ? (
            <>
              <path d={areaPath(backtest.map((b) => ({ x: x(b.day), lo: y(b.p10), hi: y(b.p90) })))} className="ops-band-back" />
              <path d={linePath(backtest.map((b) => ({ x: x(b.day), y: y(b.p50) })))} className="ops-line-back" />
            </>
          ) : null}
          <path d={areaPath(forecast.map((f) => ({ x: x(f.day), lo: y(f.p10), hi: y(f.p90) })))} className="ops-band" />
          <path d={linePath(forecast.map((f) => ({ x: x(f.day), y: y(f.p50) })))} className="ops-line-fc" />
          <path d={linePath(history.map((p) => ({ x: x(p.day), y: y(p.paidUsd) })))} className="ops-line-actual" />
          {h ? (
            <g>
              <line x1={x(h)} x2={x(h)} y1={pad.t} y2={height - pad.b} className="ops-crosshair" />
              {hv?.actual !== undefined ? <circle cx={x(h)} cy={y(hv.actual)} r={4} className="ops-dot-actual" /> : null}
              {hv?.fc ? <circle cx={x(h)} cy={y(hv.fc.p50)} r={4} className="ops-dot-fc" /> : null}
            </g>
          ) : null}
        </svg>
      ) : (
        <div style={{ height }} />
      )}
      {h && hv ? (
        <div className="ops-tip" style={{ left: Math.min(W - 170, Math.max(0, x(h) + 10)), top: 8 }}>
          <strong>{dayLong(h)}</strong>
          {hv.actual !== undefined ? <span>Paid out {usd(hv.actual)}</span> : null}
          {hv.back ? (
            <span className="muted">
              Backtest {usd(hv.back.p50)} ({usd(hv.back.p10)}–{usd(hv.back.p90)})
            </span>
          ) : null}
          {hv.fc ? (
            <span>
              Forecast {usd(hv.fc.p50)} ({usd(hv.fc.p10)}–{usd(hv.fc.p90)})
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Cash in hand over the simulated week, against the ceiling, with restock arrivals.
 * With `onScrub` it is the playback timeline.
 */
export function WeekChart({
  cash,
  ceiling,
  days,
  step,
  arrivals,
  height = 120,
  onScrub,
  title,
  dayLabels = true,
}: {
  cash: number[];
  ceiling: number[];
  days: string[];
  step: number;
  arrivals: number[];
  height?: number;
  onScrub?: (step: number) => void;
  title: string;
  dayLabels?: boolean;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const dragging = useRef(false);
  const clipId = useId().replace(/:/g, "");
  const n = cash.length;
  const pad = { l: 36, r: 8, t: dayLabels ? 18 : 8, b: 14 };
  const W = Math.max(0, width);
  const x = (s: number) => pad.l + (s / n) * (W - pad.l - pad.r);
  const max = niceMax(Math.max(...ceiling, ...cash) * 1.05);
  const y = (v: number) => pad.t + (1 - v / max) * (height - pad.t - pad.b);
  const dayW = (W - pad.l - pad.r) / Math.max(1, days.length);
  const stepAt = (clientX: number, el: Element) => {
    const r = el.getBoundingClientRect();
    return Math.max(0, Math.min(n - 1, ((clientX - r.left - pad.l) / (W - pad.l - pad.r)) * n));
  };

  // Every second step is plenty for the path at dashboard widths.
  const pts = cash.map((c, s) => ({ s, c })).filter(({ s }) => s % 2 === 0 || s === n - 1);
  const area = `${pts.map(({ s, c }, i) => `${i ? "L" : "M"}${x(s + 1)},${y(c)}`).join("")}L${x(n)},${y(0)}L${x(1)},${y(0)}Z`;
  const line = pts.map(({ s, c }, i) => `${i ? "L" : "M"}${x(s + 1)},${y(c)}`).join("");
  const ceil = ceiling.map((c, s) => `${s ? "L" : "M"}${x(s)},${y(c)}L${x(s + 1)},${y(c)}`).join("");
  const hv = hover !== null ? Math.floor(hover) : null;
  const hc = hv !== null ? stepToClock(hv) : null;

  return (
    <div className="ops-chart" ref={ref}>
      {W > 0 ? (
        <svg
          width={W}
          height={height}
          role="img"
          aria-label={title}
          className={onScrub ? "ops-scrub" : undefined}
          onPointerDown={(e) => {
            if (!onScrub) return;
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            onScrub(stepAt(e.clientX, e.currentTarget));
          }}
          onPointerMove={(e) => {
            const s = stepAt(e.clientX, e.currentTarget);
            setHover(s);
            if (dragging.current && onScrub) onScrub(s);
          }}
          onPointerUp={() => (dragging.current = false)}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={0} y={0} width={x(step)} height={height} />
            </clipPath>
          </defs>
          {ticks(max, [2, 4, 5, 3]).map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="ops-grid" />
              <text x={pad.l - 6} y={y(t) + 4} className="ops-axis" textAnchor="end">
                {axisUsd(t)}
              </text>
            </g>
          ))}
          {days.map((d, i) => (
            <g key={d}>
              {i ? <line x1={x(i * STEPS_PER_DAY)} x2={x(i * STEPS_PER_DAY)} y1={pad.t - (dayLabels ? 14 : 0)} y2={height - pad.b} className="ops-daysep" /> : null}
              {dayLabels ? (
                <text x={x(i * STEPS_PER_DAY) + 5} y={pad.t - 6} className="ops-axis">
                  {dayW >= 56 ? dayShort(d) : dayShort(d).slice(0, 3)}
                </text>
              ) : null}
            </g>
          ))}
          <path d={area} className="ops-cash-area ops-dim" />
          <path d={line} className="ops-cash-line ops-dim" />
          <g clipPath={`url(#${clipId})`}>
            <path d={area} className="ops-cash-area" />
            <path d={line} className="ops-cash-line" />
          </g>
          <path d={ceil} className="ops-ceiling" />
          {arrivals.map((s, i) => (
            <rect key={i} x={x(s) - 1} y={height - pad.b + 3} width={2} height={7} rx={1} className={s <= step ? "ops-tick-done" : "ops-tick"} />
          ))}
          <line x1={x(step)} x2={x(step)} y1={pad.t - 4} y2={height - pad.b} className="ops-playhead" />
          <circle cx={x(step)} cy={pad.t - 4} r={4} className="ops-playhead-knob" />
        </svg>
      ) : (
        <div style={{ height }} />
      )}
      {hv !== null && hc ? (
        <div className="ops-tip" style={{ left: Math.min(W - 180, Math.max(0, x(hv) + 10)), top: 4 }}>
          <strong>
            {dayShort(days[hc.day])} {clock(hc.hh, hc.mm)}
          </strong>
          <span>Cash {usd(cash[hv])}</span>
          <span className="muted">Ceiling {usd(ceiling[hv])}</span>
        </div>
      ) : null}
    </div>
  );
}
