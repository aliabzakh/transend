/**
 * Rebuilds the off-chain demo on top of a deployed contract (run deploy:testnet first):
 *   communes and 3 shops in 2 Nord-Ouest communes (each with a zero-XLM testnet account),
 *   the demo sender Jean with recipient Odette Pierre and card TS4F2K9Q (activated at
 *   Boutik Marie-Ange, PIN 1234, C$200 sent), and 60 days of synthetic shop payouts.
 *
 * Usage: npm run seed:demo            (DATABASE_URL from .env)
 *        npm run seed:demo -- --cards 15   also prints 15 demo cards to demo-cards/print.pdf
 *
 * The demo card's codes are written to demo-cards/ (gitignored). Testnet only.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
try {
  process.loadEnvFile(resolve(ROOT, ".env"));
} catch {
  /* use the shell environment */
}
if (process.env.STELLAR_NETWORK && process.env.STELLAR_NETWORK !== "testnet") {
  throw new Error("seed-demo.ts only runs against testnet.");
}

const { db, schema } = await import("../web/db/index.ts");
const demo = await import("../web/lib/server/demo.ts");
const { issueCard, approveActivation } = await import("../web/lib/server/cards.ts");
const { setPin, requestActivation } = await import("../web/lib/server/shops.ts");
const { createQuote, sendQuote } = await import("../web/lib/server/transfers.ts");
const { seedSamplePayouts } = await import("../web/lib/risk/seed.ts");

const OUT = resolve(ROOT, "demo-cards");
const args = process.argv.slice(2);
const printCount = args.includes("--cards") ? Number(args[args.indexOf("--cards") + 1]) || 15 : 0;

console.log("Communes and shops...");
await demo.ensureCommunesAndShops();

console.log("Demo sender...");
const jean = await demo.ensureSender(demo.DEMO_SENDER.email, demo.DEMO_SENDER.name);
let odette = await db.query.recipients.findFirst({ where: (r, { eq }) => eq(r.senderId, jean.id) });
if (!odette) {
  [odette] = await db
    .insert(schema.recipients)
    .values({
      senderId: jean.id,
      name: "Odette Pierre",
      relationship: "Mother",
      commune: "Môle-Saint-Nicolas",
      department: "Nord-Ouest",
    })
    .returning();
}

let card = await db.query.cards.findFirst({ where: (c, { eq }) => eq(c.recipientId, odette!.id) });
if (!card) {
  console.log("Issuing card TS4F2K9Q...");
  const issued = await issueCard(jean, odette.id, { preferredId: "TS4F2K9Q" });
  mkdirSync(OUT, { recursive: true });
  writeFileSync(resolve(OUT, `${issued.cardId}.pdf`), issued.pdf);
  writeFileSync(
    resolve(OUT, `${issued.cardId}.txt`),
    issued.secrets.codes.map((c, i) => `${String(i + 1).padStart(2, "0")} ${c}`).join("\n") +
      `\nRenewal ${issued.secrets.renewalCode}\n`,
  );
  console.log(`  codes written to demo-cards/${issued.cardId}.pdf and .txt (never committed)`);

  const shop = (await db.query.shops.findFirst({ where: (sh, { eq }) => eq(sh.id, "S-101") }))!;
  await requestActivation(shop, issued.cardId);
  await approveActivation(jean, issued.cardId);
  await setPin(shop, issued.cardId, "1234");
  const q = await createQuote(jean, issued.cardId, 200);
  const sent = await sendQuote(jean, q.quoteId);
  console.log(`  activated, PIN set, sent C$200 (US$${sent.usdOut}): ${sent.txHash}`);
  card = await db.query.cards.findFirst({ where: (c, { eq }) => eq(c.id, issued.cardId) });
} else {
  console.log(`  card ${card.id} already exists`);
}

console.log("Synthetic shop payouts (60 days, labelled Sample data)...");
await seedSamplePayouts();

if (printCount > 0) {
  console.log(`Printing ${printCount} demo cards...`);
  const { pdf, cardIds } = await demo.bulkDemoCards(printCount);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(resolve(OUT, "print.pdf"), pdf);
  console.log(`  ${cardIds.join(" ")} -> demo-cards/print.pdf`);
}

console.log(`\nDone. Sender log-in: ${demo.DEMO_SENDER.email} / DEMO_PASSWORD. Shop log-in: S-101 / SHOP_DEMO_PASSWORD.`);
process.exit(0);
