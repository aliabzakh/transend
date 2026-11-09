/**
 * Labels printed on the card. Kreyòl first, French second. These are clearly marked
 * PLACEHOLDERS until a native speaker supplies the real words. The card never shows
 * the balance, and never uses the words "cash" or "money pickup".
 */
export const cardStrings = {
  title: "TRANSEND",
  idLabel: "ID",
  renewalLabel: "Renewal",
  steps: [
    { number: "1", kr: "[KREYÒL: grate liy la]", fr: "[FRANÇAIS: gratter la ligne]" },
    { number: "2", kr: "[KREYÒL: bay telefòn lan]", fr: "[FRANÇAIS: donner le téléphone]" },
    { number: "3", kr: "[KREYÒL: antre PIN ou]", fr: "[FRANÇAIS: entrer le PIN]" },
  ],
} as const;
