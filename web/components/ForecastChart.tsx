"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { dayLabel } from "./dayLabel";

export type ChartDay = { day: string; paidUsd?: number; p10?: number; p50?: number; p90?: number; restock?: string[] };


const PAD = { top: 16, right: 8, bottom: 40, left: 40 }; // chart geometry in SVG units, not page spacing
const HEIGHT = 180;

/**
 * Past payouts (bars), then the forecast band (p10 to p90) with its likely line
 * (p50), the shop's cash ceiling (dashed) and restock days (Gold dots under the
 * axis). Hover or arrow keys show one day's numbers; the table below the chart
 * gives every number without hovering.
 */
export function ForecastChart({ data, ceilingUsd, labels }: {
  data: ChartDay[];
  ceilingUsd: number;
  labels: { paid: string; low: string; likely: string; high: string; ceiling: string; restock: string; chart: string };
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = data.length;
  const plotW = width - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const step = plotW / Math.max(1, n);
  const max = Math.max(ceilingUsd, ...data.map((d) => Math.max(d.paidUsd ?? 0, d.p90 ?? 0))) * 1.1 || 1;
  const x = (i: number) => PAD.left + step * i + step / 2;
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const firstF = data.findIndex((d) => d.p50 !== undefined);
  const fc = firstF < 0 ? [] : data.slice(firstF).map((d, k) => ({ ...d, i: firstF + k }));

  const band =
    fc.length > 0
      ? `M${fc.map((d) => `${x(d.i)},${y(d.p90!)}`).join(" L")} L${[...fc]
          .reverse()
          .map((d) => `${x(d.i)},${y(d.p10!)}`)
          .join(" L")} Z`
      : "";
  const line = fc.length > 0 ? `M${fc.map((d) => `${x(d.i)},${y(d.p50!)}`).join(" L")}` : "";
  const ticks = [0, 0.5, 1].map((t) => Math.round((max / 1.1) * t));
  const barW = Math.max(2, step - 4);

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientX - r.left - PAD.left) / step);
    setActive(i >= 0 && i < n ? i : null);
  };
  const key = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const d = e.key === "ArrowLeft" ? -1 : 1;
    setActive((a) => Math.max(0, Math.min(n - 1, (a ?? (d > 0 ? -1 : n)) + d)));
  };

  const a = active !== null ? data[active] : null;
  const fmt = (v: number) => `US$${v.toFixed(0)}`;

  return (
    <div className="chart-wrap" ref={wrap}>
      <svg
        className="chart"
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        role="img"
        aria-label={labels.chart}
        tabIndex={0}
        onPointerMove={pick}
        onPointerLeave={() => setActive(null)}
        onKeyDown={key}
        onBlur={() => setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="chart-grid" x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="chart-text" x={PAD.left - 6} y={y(t) + 4} textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {data.map((d, i) =>
          d.paidUsd !== undefined ? (
            <rect
              key={d.day}
              className="chart-history"
              x={x(i) - barW / 2}
              y={y(d.paidUsd)}
              width={barW}
              height={Math.max(0, y(0) - y(d.paidUsd))}
              rx={Math.min(2, barW / 2)}
              opacity={active === null || active === i ? 1 : 0.6}
            />
          ) : null,
        )}
        {firstF > 0 ? (
          <line className="chart-today" x1={x(firstF) - step / 2} x2={x(firstF) - step / 2} y1={PAD.top} y2={y(0)} />
        ) : null}
        {band ? <path className="chart-band" d={band} /> : null}
        {line ? <path className="chart-line" d={line} pathLength={800} /> : null}
        <line className="chart-ceiling" x1={PAD.left} x2={width - PAD.right} y1={y(ceilingUsd)} y2={y(ceilingUsd)} />
        <text className="chart-text chart-text-gold" x={width - PAD.right} y={y(ceilingUsd) - 6} textAnchor="end">
          {labels.ceiling} {fmt(ceilingUsd)}
        </text>
        {data.map((d, i) =>
          d.restock?.length ? <circle key={`r-${d.day}`} className="chart-restock" cx={x(i)} cy={y(0) + 12} r={4} /> : null,
        )}
        {data.map((d, i) =>
          // Label every k-th day, counted from the first forecast day so "today" always gets one.
          (((i - Math.max(0, firstF)) % Math.ceil(n / 7)) + Math.ceil(n / 7)) % Math.ceil(n / 7) === 0 ? (
            <text key={`l-${d.day}`} className="chart-text" x={x(i)} y={HEIGHT - 6} textAnchor="middle">
              {dayLabel(d.day)}
            </text>
          ) : null,
        )}
        {active !== null ? (
          <line className="chart-cross" x1={x(active)} x2={x(active)} y1={PAD.top} y2={y(0)} />
        ) : null}
      </svg>
      {a && active !== null ? (
        <div
          className="chart-tip"
          role="status"
          style={{ left: Math.min(width - 180, Math.max(0, x(active) - 90)) }}
        >
          <p className="chart-tip-day">{dayLabel(a.day)}</p>
          {a.paidUsd !== undefined ? (
            <p>
              <strong>{fmt(a.paidUsd)}</strong> {labels.paid}
            </p>
          ) : null}
          {a.p50 !== undefined ? (
            <>
              <p>
                <strong>{fmt(a.p50)}</strong> {labels.likely}
              </p>
              <p className="muted">
                {fmt(a.p10!)} to {fmt(a.p90!)} ({labels.low} to {labels.high})
              </p>
            </>
          ) : null}
          {a.restock?.length ? (
            <p className="chart-tip-restock">
              {labels.restock}: {a.restock.join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
