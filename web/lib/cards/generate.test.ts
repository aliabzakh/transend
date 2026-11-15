import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { chainCardId } from "./chain-id";
import { codeHash, generateCard, randomCode } from "./generate";
import { CROCKFORD, isCode, normalizeCode } from "./format";
import { cardsPdf } from "./pdf";

process.env.CARD_ID_SECRET ??= "test-secret";

describe("card codes", () => {
  it("are 12 Crockford base32 characters", () => {
    for (let i = 0; i < 200; i++) {
      const c = randomCode();
      expect(c).toHaveLength(12);
      expect([...c].every((ch) => CROCKFORD.includes(ch))).toBe(true);
      expect(isCode(c)).toBe(true);
    }
  });

  it("hash as sha256(card_id || line u32 BE || code), the contract's layout", () => {
    const want = createHash("sha256")
      .update(Buffer.concat([Buffer.from("TS4F2K9Q"), Buffer.from([0, 0, 0, 3]), Buffer.from("QWCA5KHE7QET")]))
      .digest();
    expect(codeHash("TS4F2K9Q", 3, "QWCA5KHE7QET").equals(want)).toBe(true);
  });

  it("a card has 20 distinct codes, 20 hashes and a renewal hash on line 20", () => {
    const c = generateCard("TS4F2K9Q");
    expect(c.codes).toHaveLength(20);
    expect(new Set(c.codes).size).toBe(20);
    expect(c.hashes).toHaveLength(20);
    expect(c.renewalHash.equals(codeHash(chainCardId("TS4F2K9Q"), 20, c.renewalCode))).toBe(true);
    expect(c.hashes[0].equals(codeHash(chainCardId("TS4F2K9Q"), 0, c.codes[0]))).toBe(true);
  });

  it("scrambles a printed card ID the same way every time, into a valid on-chain ID", () => {
    const id = chainCardId("TS4F2K9Q");
    expect(id).toBe(chainCardId("TS4F2K9Q"));
    expect(id).not.toBe(chainCardId("TS4F2K9R"));
    expect(id).toMatch(/^[a-z0-9]{1,32}$/);
  });

  it("normalizes typed codes", () => {
    expect(normalizeCode("qwca-5khe 7qet")).toBe("QWCA5KHE7QET");
    expect(normalizeCode("IOL0")).toBe("1010");
  });

  it("renders a PDF", async () => {
    const pdf = await cardsPdf([generateCard("TS4F2K9Q")]);
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-");
  });
});
