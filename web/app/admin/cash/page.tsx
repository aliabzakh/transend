import { Screen } from "@/components/ui/Screen";
import { ForecastCard } from "@/components/ForecastCard";
import { db, schema } from "@/db";
import { asc } from "drizzle-orm";
import { forecastFor, modelMetrics } from "@/lib/server/forecast";
import { a } from "@/strings/admin.en";
import { RecomputeButton } from "./RecomputeButton";

// Rendered per request so "tomorrow" is always tomorrow. Protected by the admin password.
export const dynamic = "force-dynamic";

export default async function AdminCashPage() {
  const shops = await db.select().from(schema.shops).orderBy(asc(schema.shops.id));
  const rows = await Promise.all(shops.map((s) => forecastFor(s)));
  const m = modelMetrics();

  return (
    <Screen title={a.cash.title} wide action={<RecomputeButton />}>
      <div className="notice">
        <p>
          <span className="pill pill-wait">{a.cash.sample}</span>
        </p>
        <p className="small">{a.cash.sampleLead}</p>
        {m ? (
          <p className="caption muted">
            {a.cash.metrics(m.modelMae.toFixed(2), m.baselineMae.toFixed(2), m.improvementPct.toFixed(0))}
          </p>
        ) : null}
      </div>
      {rows.length === 0 ? <p className="muted">{a.cash.empty}</p> : null}
      {rows.map((f) => (
        <ForecastCard key={f.shop.id} f={f} />
      ))}
    </Screen>
  );
}
