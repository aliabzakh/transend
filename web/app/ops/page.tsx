import type { Metadata } from "next";
import { opsData } from "@/lib/server/ops";
import { OpsDashboard } from "./OpsDashboard";
import "./ops.css";

// Public, no login, like /proof. Read-only: it never changes a ceiling.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Transend operations",
  description: "The cash network from above: forecast, cash ceilings and top-up times for every shop. Sample data.",
};

export default async function OpsPage() {
  const data = await opsData();
  return <OpsDashboard data={data} />;
}
