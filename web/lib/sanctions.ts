/** Mock screening against a small seeded list. Production uses a screening vendor. */
const SEEDED = ["sanctioned person", "test sanctioned", "jean-claude blocked"];

export function isSanctioned(name: string): boolean {
  const n = name.trim().toLowerCase().replace(/\s+/g, " ");
  return SEEDED.includes(n);
}
