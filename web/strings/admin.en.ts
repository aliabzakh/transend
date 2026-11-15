import { common } from "./common";

/** Admin and operations strings. English only; admin is for the team. */
export const a = {
  ...common,
  nav: { cards: "Cards", areas: "Areas", cash: "Cash", ops: "Operations map" },
  brand: `${common.brand} admin`,
  cash: {
    title: "Cash distribution",
    sample: "Sample data",
    sampleLead:
      "There is no real withdrawal history yet: these forecasts run on synthetic payouts. The pipeline is real; the accuracy numbers are not real-world numbers. The forecast only sets each shop's cash ceiling between C$150 and the admin's hard cap, and never approves or refuses a payout.",
    metrics: (modelMae: string, baselineMae: string, pct: string) =>
      `Trained model (gradient-boosted quantiles) on held-out days: average error US$${modelMae} against US$${baselineMae} for the rules, ${pct}% better. It goes live only when it is at least 10% better and FORECAST_MODEL_MODE is "model".`,
    forecaster: { model: "Forecast: model", rules: "Forecast: rules" } as Record<string, string>,
    area: "Area",
    last7: "Paid out, last 7 days",
    ceilingNow: "Cash ceiling now",
    suggested: "Suggested ceiling",
    cap: (cad: number) => `cap C$${cad}`,
    chart: (shop: string) => `${shop}: payouts for the last two weeks and the forecast for the coming week`,
    legend: {
      paid: "Paid out",
      band: "Forecast range (p10 to p90)",
      likely: "Likely (p50)",
      ceiling: "Cash ceiling",
      restock: "Restock day",
    },
    tip: { paid: "paid out", low: "low", likely: "likely", high: "high", ceiling: "Ceiling", restock: "Restock" },
    table: { day: "Day", low: "Low (p10)", likely: "Likely (p50)", high: "High (p90)", restock: "Restock" },
    showTable: "Show the numbers",
    empty: "No shops yet. Run npm run seed:demo to add the demo shops.",
    errorTitle: "Could not load the forecast",
    errorLead: "The database or the forecast service did not answer. Try again in a moment.",
    retry: "Try again",
    recompute: "Recompute",
    recomputing: "Recomputing...",
    loading: "Loading the forecast...",
  },
} as const;
