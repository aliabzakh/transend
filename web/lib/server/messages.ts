import { db, schema } from "@/db";

/** One entry in the sender's simulated SMS inbox and activity feed. */
export async function postMessage(
  senderId: string,
  cardId: string | null,
  kind: "sent" | "pickup" | "reply" | "hold" | "info" | "activation",
  fromLabel: string,
  text: string,
  txHash?: string,
) {
  await db.insert(schema.messages).values({ senderId, cardId, kind, fromLabel, text, txHash });
}
