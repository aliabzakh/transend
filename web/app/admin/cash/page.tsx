import { Screen } from "@/components/ui/Screen";
import { db, schema } from "@/db";
import { asc } from "drizzle-orm";
import { forecastFor, modelMetrics } from "@/lib/server/forecast";
import { RecomputeButton } from "./RecomputeButton";

// Rendered per request so "tomorrow" is always tomorrow. Protected by the admin password.
export const dynamic = "force-dynamic";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const label = (day: string) => `${DOW[new Date(`${day}T00:00:00Z`).getUTCDay()]} ${day.slice(5)}`;

export default async function AdminCashPage() {
  const shops = await db.select().from(schema.shops).orderBy(asc(schema.shops.id));
  const rows = await Promise.all(shops.map((s) => forecastFor(s)));
  const m = modelMetrics();

  return (
    <Screen title="Cash distribution" action={<RecomputeButton />}>
      <p>
        <strong>Sample data.</strong> There is no real withdrawal history yet: these forecasts run on synthetic payouts.
        The pipeline is real; the accuracy numbers are not real-world numbers. The forecast only sets each shop&apos;s
        cash ceiling between C$150 and the admin&apos;s hard cap, and never approves or refuses a payout.
      </p>
      {m ? (
        <p className="muted small">
          Trained model (gradient-boosted quantiles) on held-out days: average error US${m.modelMae.toFixed(2)} against
          US${m.baselineMae.toFixed(2)} for the rules, {m.improvementPct.toFixed(0)}% better. It goes live only when it is at
          least 10% better and FORECAST_MODEL_MODE is &quot;model&quot;.
        </p>
      ) : null}
      {rows.map((f) => (
        <section key={f.shop.id} className="panel">
          <h2 className="section-title">
            {f.shop.name} <span className="muted small">({f.shop.id})</span>
          </h2>
          <p className="small">
            <strong>Forecast: {f.forecaster}</strong> · {f.reason}
          </p>
          <table className="table">
            <tbody>
              <tr>
                <th scope="row">Area</th>
                <td>
                  {f.area.name}: {f.area.status}
                </td>
              </tr>
              <tr>
                <th scope="row">Paid out, last 7 days</th>
                <td className="num">US${f.last7Usd.toFixed(2)}</td>
              </tr>
              <tr>
                <th scope="row">Cash ceiling now</th>
                <td className="num">C${f.shop.ceilingCad}</td>
              </tr>
              <tr>
                <th scope="row">Suggested ceiling</th>
                <td className="num">
                  C${f.suggestedCeilingCad} (cap C${f.shop.hardCapCad})
                </td>
              </tr>
            </tbody>
          </table>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col" className="num">
                  Low (p10)
                </th>
                <th scope="col" className="num">
                  Likely (p50)
                </th>
                <th scope="col" className="num">
                  High (p90)
                </th>
                <th scope="col">Restock</th>
              </tr>
            </thead>
            <tbody>
              {f.days.map((d, i) => (
                <tr key={d.day}>
                  <th scope="row">{label(d.day)}</th>
                  <td className="num">US${d.p10.toFixed(0)}</td>
                  <td className="num">US${d.p50.toFixed(0)}</td>
                  <td className="num">US${d.p90.toFixed(0)}</td>
                  <td className="mono small">{f.restock[i]?.windows.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </Screen>
  );
}
