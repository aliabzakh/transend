import { Bot, Calculator, MapPin } from "lucide-react";
import type { ShopForecastView } from "@/lib/server/forecast";
import { CONFIG } from "@/lib/config";
import { a } from "@/strings/admin.en";
import { ForecastChart, type ChartDay } from "./ForecastChart";
import { dayLabel } from "./dayLabel";

const AREA_PILL: Record<string, string> = { calm: "pill-ok", tense: "pill-wait", closed: "pill-warn" };
const HISTORY_DAYS = 14;

/** One shop on /admin/cash: who forecasts, the numbers that matter, the chart and the table. */
export function ForecastCard({ f }: { f: ShopForecastView }) {
  const c = a.cash;
  const restockFor = (day: string) => f.restock.find((r) => r.day === day)?.windows ?? [];
  const data: ChartDay[] = [
    ...f.history.slice(-HISTORY_DAYS).map((h) => ({ day: h.day, paidUsd: h.paidUsd })),
    ...f.days.map((d) => ({ ...d, restock: restockFor(d.day) })),
  ];
  const ceilingUsd = f.shop.ceilingCad * CONFIG.demoRateCadUsd;

  return (
    <section className="card" aria-labelledby={`shop-${f.shop.id}`}>
      <div className="spread">
        <div>
          <h2 id={`shop-${f.shop.id}`} className="section-title">
            {f.shop.name} <span className="muted small">({f.shop.id})</span>
          </h2>
          <p className="caption muted">{f.reason}</p>
        </div>
        <div className="inline">
          <span className={`pill ${f.forecaster === "model" ? "pill-ok" : "pill-muted"}`}>
            {f.forecaster === "model" ? <Bot className="icon" aria-hidden /> : <Calculator className="icon" aria-hidden />}
            {c.forecaster[f.forecaster] ?? f.forecaster}
          </span>
          <span className={`pill ${AREA_PILL[f.area.status] ?? "pill-muted"}`}>
            <MapPin className="icon" aria-hidden />
            {f.area.name}: {f.area.status}
          </span>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <span className="stat-value">US${f.last7Usd.toFixed(2)}</span>
          <span className="stat-label">{c.last7}</span>
        </div>
        <div className="stat">
          <span className="stat-value">C${f.shop.ceilingCad}</span>
          <span className="stat-label">{c.ceilingNow}</span>
        </div>
        <div className="stat">
          <span className="stat-value">C${f.suggestedCeilingCad}</span>
          <span className="stat-label">
            {c.suggested} ({c.cap(f.shop.hardCapCad)})
          </span>
        </div>
      </div>

      <ForecastChart
        data={data}
        ceilingUsd={ceilingUsd}
        labels={{ ...c.tip, chart: c.chart(f.shop.name) }}
      />
      <div className="legend" aria-hidden>
        <span className="legend-item">
          <span className="legend-swatch swatch-history" />
          {c.legend.paid}
        </span>
        <span className="legend-item">
          <span className="legend-swatch swatch-band" />
          {c.legend.band}
        </span>
        <span className="legend-item">
          <span className="legend-swatch swatch-line" />
          {c.legend.likely}
        </span>
        <span className="legend-item">
          <span className="legend-swatch swatch-ceiling" />
          {c.legend.ceiling}
        </span>
        <span className="legend-item">
          <span className="legend-swatch swatch-restock" />
          {c.legend.restock}
        </span>
      </div>

      <details className="disclosure" open>
        <summary>{c.showTable}</summary>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">{c.table.day}</th>
                <th scope="col" className="num">
                  {c.table.low}
                </th>
                <th scope="col" className="num">
                  {c.table.likely}
                </th>
                <th scope="col" className="num">
                  {c.table.high}
                </th>
                <th scope="col">{c.table.restock}</th>
              </tr>
            </thead>
            <tbody>
              {f.days.map((d) => (
                <tr key={d.day}>
                  <th scope="row">{dayLabel(d.day)}</th>
                  <td className="num">US${d.p10.toFixed(0)}</td>
                  <td className="num">US${d.p50.toFixed(0)}</td>
                  <td className="num">US${d.p90.toFixed(0)}</td>
                  <td className="mono small">{restockFor(d.day).join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
