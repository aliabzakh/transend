import { body, route } from "@/lib/server/http";
import { requireSender } from "@/lib/server/session";
import { issueCard } from "@/lib/server/cards";

export const maxDuration = 60;

/** Issues a card and returns its PDF. This is the only time the plain codes exist. */
export const POST = route(async (req) => {
  const user = await requireSender();
  const { recipientId } = await body<{ recipientId: string }>(req);
  const { cardId, pdf } = await issueCard(user, recipientId);
  return new Response(Buffer.from(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="transend-card-${cardId}.pdf"`,
      "x-card-id": cardId,
      "cache-control": "no-store",
    },
  });
});
