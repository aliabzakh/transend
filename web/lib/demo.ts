/**
 * Values the forms start with, so the testnet demo is a few taps from start to finish.
 * All of these are public demo data (see the README). The card's scratch codes are not
 * here: they exist only on the printed card and the PDF made with it.
 */
export const DEMO_SENDER = {
  email: "jean@transend.demo",
  password: "transend-demo",
  /** For the identity step after a new sign-up. */
  name: "Jean Pierre",
  dob: "1984-06-12",
};

/** A second person for "Add someone", so it does not clash with Odette Pierre. */
export const DEMO_RECIPIENT = {
  name: "Rose Joseph",
  relationship: "Sister",
  commune: "Jean-Rabel",
  department: "Nord-Ouest",
};

export const DEMO_SHOP = { code: "S-101", password: "transend-shop" };

/** Odette's demo card (PIN 1234) and a payout under every shop's limit. */
export const DEMO_CARD = { id: "TS4F2K9Q", payoutUsd: "40" };
