/**
 * Postgres schema (Drizzle). Holds no plain code, no plain PIN, no image and no
 * secret key in the clear: card codes exist only in the printed PDF, PINs are
 * argon2id hashes, and custodial Stellar keys are encrypted with KEY_ENCRYPTION_KEY.
 */
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["sender", "admin"]);
export const cardStatusEnum = pgEnum("card_status", ["Pending", "Active", "Frozen", "Retired"]);
export const areaStatusEnum = pgEnum("area_status", ["calm", "tense", "closed"]);
export const transferKindEnum = pgEnum("transfer_kind", [
  "deposit",
  "redeem",
  "stake",
  "unstake",
  "freeze",
  "unfreeze",
  "activate",
  "issue",
]);

const created = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/** Senders (and an admin row if ever needed). Shops log in separately. */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("sender"),
  name: text("name"),
  kycVerified: boolean("kyc_verified").notNull().default(false),
  stellarPublic: text("stellar_public"),
  stellarSecretEnc: text("stellar_secret_enc"),
  createdAt: created(),
});

export const communes = pgTable("communes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  department: text("department").notNull(),
  status: areaStatusEnum("status").notNull().default("calm"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shops = pgTable("shops", {
  id: text("id").primaryKey(), // shop code, e.g. S-101
  name: text("name").notNull(),
  communeId: text("commune_id")
    .notNull()
    .references(() => communes.id),
  passwordHash: text("password_hash").notNull(),
  /** Today's ceiling, set by the forecast between the floor and the hard cap. */
  ceilingCad: integer("ceiling_cad").notNull().default(500),
  hardCapCad: integer("hard_cap_cad").notNull().default(1000),
  stellarPublic: text("stellar_public"),
  stellarSecretEnc: text("stellar_secret_enc"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  createdAt: created(),
});

export const recipients = pgTable(
  "recipients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    relationship: text("relationship").notNull(),
    commune: text("commune").notNull(),
    department: text("department").notNull(),
    createdAt: created(),
  },
  (t) => [index("recipients_sender_idx").on(t.senderId)],
);

/** One row per card. No codes: the contract stores only their hashes. */
export const cards = pgTable(
  "cards",
  {
    id: text("id").primaryKey(), // e.g. TS4F2K9Q
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => recipients.id),
    status: cardStatusEnum("status").notNull().default("Pending"),
    pinHash: text("pin_hash"),
    pinSalt: text("pin_salt"),
    wrongPins: integer("wrong_pins").notNull().default(0),
    activationShopId: text("activation_shop_id").references(() => shops.id),
    activationRequestedAt: timestamp("activation_requested_at", { withTimezone: true }),
    pdfIssuedAt: timestamp("pdf_issued_at", { withTimezone: true }),
    createdAt: created(),
  },
  (t) => [index("cards_sender_idx").on(t.senderId)],
);

export const quotes = pgTable("quotes", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => users.id),
  cardId: text("card_id")
    .notNull()
    .references(() => cards.id),
  amountCad: doublePrecision("amount_cad").notNull(),
  feeCad: doublePrecision("fee_cad").notNull(),
  rate: doublePrecision("rate").notNull(),
  usdOut: doublePrecision("usd_out").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: created(),
});

/** Mirror of every on-chain action we submit. Feeds limits, the inbox and the forecast. */
export const transfers = pgTable(
  "transfers",
  {
    id: serial("id").primaryKey(),
    kind: transferKindEnum("kind").notNull(),
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id),
    senderId: uuid("sender_id").references(() => users.id),
    shopId: text("shop_id").references(() => shops.id),
    amountUsd: doublePrecision("amount_usd"),
    amountCad: doublePrecision("amount_cad"),
    line: integer("line"),
    txHash: text("tx_hash"),
    createdAt: created(),
  },
  (t) => [
    index("transfers_sender_idx").on(t.senderId, t.createdAt),
    index("transfers_shop_idx").on(t.shopId, t.createdAt),
    index("transfers_card_idx").on(t.cardId),
  ],
);

/** Simulated SMS inbox and activity for the sender. */
export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id),
    cardId: text("card_id").references(() => cards.id),
    kind: text("kind").notNull(), // sent | pickup | reply | hold | info | activation
    fromLabel: text("from_label").notNull(),
    text: text("text").notNull(),
    txHash: text("tx_hash"),
    createdAt: created(),
  },
  (t) => [index("messages_sender_idx").on(t.senderId, t.createdAt)],
);

/** Synthetic daily payouts per shop (labelled "Sample data"). Numbers only. */
export const samplePayouts = pgTable(
  "sample_payouts",
  {
    shopId: text("shop_id")
      .notNull()
      .references(() => shops.id),
    day: date("day").notNull(),
    paidUsd: doublePrecision("paid_usd").notNull(),
    areaStatus: areaStatusEnum("area_status").notNull().default("calm"),
  },
  (t) => [primaryKey({ columns: [t.shopId, t.day] })],
);

/** Forecast records hold numbers only: never a PIN, a code or a name. */
export const forecasts = pgTable(
  "forecasts",
  {
    id: serial("id").primaryKey(),
    shopId: text("shop_id")
      .notNull()
      .references(() => shops.id),
    day: date("day").notNull(),
    p10: doublePrecision("p10").notNull(),
    p50: doublePrecision("p50").notNull(),
    p90: doublePrecision("p90").notNull(),
    ceilingCad: integer("ceiling_cad").notNull(),
    modelVersion: text("model_version").notNull(),
    createdAt: created(),
  },
  (t) => [index("forecasts_shop_idx").on(t.shopId, t.createdAt)],
);

/** Fixed-window rate limits shared by all server instances. */
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [uniqueIndex("rate_limits_key_window").on(t.key, t.windowStart)],
);
