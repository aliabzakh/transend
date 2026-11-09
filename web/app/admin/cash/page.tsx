import { Screen } from "@/components/ui/Screen";
import { COMMUNES, SHOPS } from "@/lib/demo/areas";
import { forecastTomorrow, sampleHistory } from "@/lib/risk/forecast";

// Rendered per request so "tomorrow" is always tomorrow.
export const dynamic = "force-dynamic";

const WAITING_BALANCES_USD: Record<string, number> = { "S-101": 640, "S-102": 410, "S-201": 520 };
const AREA_STATUS: Record<string, string> = { mole: "Calm", anse: "Tense", bassin: "Calm" };

export default function AdminCashPage() {
  const today = new Date();
  const rows = SHOPS.map((shop) => {
    const history = sampleHistory(shop.id, today);
    const f = forecastTomorrow(shop.id, history, today, WAITING_BALANCES_USD[shop.id] ?? 0);
    const commune = COMMUNES.find((c) => c.id === shop.communeId)!;
    return { shop, commune, f, last7: history.slice(-7).reduce((s, p) => s + p.paidUsd, 0) };
  });

  return (
    <Screen title="Cash distribution">
      <p>
        Sample data. Forecasts use a 7-day average lifted on known busy days (start of month, September school fees,
        year-end). There is no machine learning yet: that needs real withdrawal data first.
      </p>
      {rows.map(({ shop, commune, f, last7 }) => (
        <section key={shop.id} className="panel">
          <h2 className="section-title">
            {shop.name} <span className="muted small">({shop.id})</span>
          </h2>
          <table className="table">
            <tbody>
              <tr>
                <th scope="row">Area</th>
                <td>
                  {commune.name}: {AREA_STATUS[commune.id]}
                </td>
              </tr>
              <tr>
                <th scope="row">Paid out, last 7 days</th>
                <td className="num">US${last7}</td>
              </tr>
              <tr>
                <th scope="row">Forecast for tomorrow</th>
                <td className="num">
                  US${f.tomorrowUsd}
                  {f.reason ? ` (${f.reason})` : ""}
                </td>
              </tr>
              <tr>
                <th scope="row">Suggested cash ceiling</th>
                <td className="num">US${f.suggestedCeilingUsd}</td>
              </tr>
              <tr>
                <th scope="row">Current ceiling</th>
                <td className="num">C${shop.ceilingCad}</td>
              </tr>
              <tr>
                <th scope="row">Suggested restock times</th>
                <td className="num mono">{f.restockTimes.join(" and ")}</td>
              </tr>
            </tbody>
          </table>
        </section>
      ))}
    </Screen>
  );
}
