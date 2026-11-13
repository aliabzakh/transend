import { body, route } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/session";
import { bulkDemoCards } from "@/lib/server/demo";

export const maxDuration = 300;

/** Bulk-generates demo cards and returns one print-ready PDF. The codes exist only in this PDF. */
export const POST = route(async (req) => {
  requireAdmin(req);
  const { n } = await body<{ n: number }>(req);
  const { pdf, cardIds } = await bulkDemoCards(Number(n) || 15);
  return new Response(Buffer.from(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="transend-demo-cards-${cardIds.length}.pdf"`,
      "x-card-ids": cardIds.join(","),
      "cache-control": "no-store",
    },
  });
});
