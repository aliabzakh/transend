import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { LINES, codeHash, generateCard, randomCode } from "./generate";
import { CROCKFORD, isCode, normalizeCode } from "./format";
import { cardsPdf } from "./pdf";
import { CARD_LAYOUT } from "./template.generated";

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
    expect(c.renewalHash.equals(codeHash("TS4F2K9Q", 20, c.renewalCode))).toBe(true);
  });

  it("normalizes typed codes", () => {
    expect(normalizeCode("qwca-5khe 7qet")).toBe("QWCA5KHE7QET");
    expect(normalizeCode("IOL0")).toBe("1010");
  });

  it("renders the designed card: A6 front and back per card, or one Letter sheet per card", async () => {
    const cards = [generateCard("TS4F2K9Q"), generateCard("TS7WQ3MK")];
    const a6 = await PDFDocument.load(await cardsPdf(cards, "a6"));
    expect(a6.getPageCount()).toBe(4);
    expect(a6.getPage(0).getSize()).toEqual({ width: CARD_LAYOUT.width, height: CARD_LAYOUT.height });
    const sheet = await PDFDocument.load(await cardsPdf(cards, "sheet"));
    expect(sheet.getPageCount()).toBe(2);
    expect(sheet.getPage(0).getSize()).toEqual({ width: 792, height: 612 });
  });

  it("has a slot on the template for every printed code", () => {
    expect(CARD_LAYOUT.codes).toHaveLength(LINES);
  });
});
