/**
 * The printed card: the designed front and back from docs/brand/cards, with this card's
 * ID, QR (the card ID only), 20 codes and renewal code drawn where the sample ones sat.
 * The card never shows the balance, and never uses the words "cash" or "money pickup".
 *
 * The artwork is a fixed template (template.generated.ts); rebuild it with
 * `npm run cards:template` after changing the SVGs.
 */
import { PDFDocument, StandardFonts, rgb, type PDFEmbeddedPage, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import { groupCode } from "./format";
import type { CardSecrets } from "./generate";
import { CARD_LAYOUT as L, CARD_TEMPLATE_PDF } from "./template.generated";

/**
 * "a6": two A6 pages per card, front then back, for a print shop or duplex A6 card stock.
 * "sheet": one landscape Letter sheet per card, front and back side by side: cut on the
 * corner marks, fold on the middle marks with the print outside. Prints on any office printer.
 */
export type CardLayout = "a6" | "sheet";

const LETTER = { w: 792, h: 612 }; // landscape
const MARK = rgb(0.55, 0.55, 0.55);

function hex(c: string) {
  const n = parseInt(c.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function drawQr(page: PDFPage, text: string, ox: number, oy: number) {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const cell = L.qr.size / n;
  const top = oy + L.qr.top;
  const color = hex(L.qr.color);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.modules.get(r, c)) {
        // A hair of overlap so neighbouring modules print as one block, with no seams.
        page.drawRectangle({ x: ox + L.qr.x + c * cell, y: top - (r + 1) * cell, width: cell + 0.05, height: cell + 0.05, color });
      }
    }
  }
}

/** Draws the back of `card` with its bottom-left corner at (ox, oy). */
function drawBack(page: PDFPage, back: PDFEmbeddedPage, mono: PDFFont, card: CardSecrets, ox: number, oy: number) {
  page.drawPage(back, { x: ox, y: oy });
  page.drawText(card.cardId, { x: ox + L.id.x, y: oy + L.id.y, size: L.id.size, font: mono, color: hex(L.id.color) });
  drawQr(page, card.cardId, ox, oy);
  const codeColor = hex(L.code.color);
  card.codes.forEach((code, i) => {
    const at = L.codes[i];
    page.drawText(groupCode(code), { x: ox + at.x, y: oy + at.y, size: L.code.size, font: mono, color: codeColor });
  });
  page.drawText(groupCode(card.renewalCode), {
    x: ox + L.renewal.x,
    y: oy + L.renewal.y,
    size: L.renewal.size,
    font: mono,
    color: hex(L.renewal.color),
  });
}

/** Corner crop marks just outside a W x H box, and fold ticks at `foldX` above and below it. */
function drawMarks(page: PDFPage, x: number, y: number, w: number, h: number, foldX: number) {
  const gap = 4;
  const len = 14;
  const t = 0.5;
  for (const cx of [x, x + w]) {
    for (const cy of [y, y + h]) {
      const sx = cx === x ? -1 : 1;
      const sy = cy === y ? -1 : 1;
      page.drawLine({ start: { x: cx + sx * gap, y: cy }, end: { x: cx + sx * (gap + len), y: cy }, thickness: t, color: MARK });
      page.drawLine({ start: { x: cx, y: cy + sy * gap }, end: { x: cx, y: cy + sy * (gap + len) }, thickness: t, color: MARK });
    }
  }
  for (const [y0, y1] of [[y + h + gap, y + h + gap + len], [y - gap, y - gap - len]]) {
    page.drawLine({ start: { x: foldX, y: y0 }, end: { x: foldX, y: y1 }, thickness: t, color: MARK, dashArray: [2, 2] });
  }
}

/** One PDF for one or more cards. Used for a sender's card and for the admin's print batch. */
export async function cardsPdf(cards: CardSecrets[], layout: CardLayout = "a6"): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(cards.length === 1 ? `Transend card ${cards[0].cardId}` : `Transend cards (${cards.length})`);
  const [front, back] = await doc.embedPdf(Buffer.from(CARD_TEMPLATE_PDF, "base64"), [0, 1]);
  const mono = await doc.embedFont(StandardFonts.CourierBold);
  const caption = await doc.embedFont(StandardFonts.Helvetica);

  for (const card of cards) {
    if (layout === "a6") {
      doc.addPage([L.width, L.height]).drawPage(front, { x: 0, y: 0 });
      drawBack(doc.addPage([L.width, L.height]), back, mono, card, 0, 0);
      continue;
    }
    const page = doc.addPage([LETTER.w, LETTER.h]);
    const x = (LETTER.w - 2 * L.width) / 2;
    const y = (LETTER.h - L.height) / 2;
    page.drawPage(front, { x, y });
    drawBack(page, back, mono, card, x + L.width, y);
    drawMarks(page, x, y, 2 * L.width, L.height, x + L.width);
    page.drawText(`${card.cardId}  ·  Cut on the corner marks. Fold on the middle marks, print outside. Demo card, testnet.`, {
      x,
      y: 28,
      size: 7.5,
      font: caption,
      color: MARK,
    });
  }
  return doc.save();
}
