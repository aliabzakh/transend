/**
 * The printed card, one colour (black on white) so it prints anywhere. It shows
 * the card ID, a QR code holding only the card ID, three picture steps, 20
 * numbered lines in groups of four and the renewal line. Never the balance and
 * never the words "cash" or "money pickup".
 */
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import QRCode from "qrcode";
import { cardStrings } from "@/strings/card";
import { groupCode } from "./format";
import type { CardSecrets } from "./generate";

const MM = 72 / 25.4;
// A6 portrait folds into a wallet and fits 21 lines at a readable size.
const W = 105 * MM;
const H = 148 * MM;
const INK = rgb(0, 0, 0);

function drawQr(page: PDFPage, text: string, x: number, y: number, size: number) {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const cell = size / n;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.modules.get(r, c)) {
        page.drawRectangle({ x: x + c * cell, y: y + size - (r + 1) * cell, width: cell, height: cell, color: INK });
      }
    }
  }
}

/** Simple outline icons for the three steps, drawn with lines so they stay one colour. */
function drawStepIcon(page: PDFPage, i: number, x: number, y: number) {
  const s = 10;
  if (i === 0) {
    // scratch: a strip with diagonal marks
    page.drawRectangle({ x, y, width: s, height: s * 0.6, borderColor: INK, borderWidth: 0.8 });
    for (let k = 0; k < 3; k++) page.drawLine({ start: { x: x + 2 + k * 3, y: y + 1 }, end: { x: x + 4 + k * 3, y: y + 5 }, thickness: 0.6, color: INK });
  } else if (i === 1) {
    // phone
    page.drawRectangle({ x: x + 2, y: y - 2, width: s * 0.6, height: s, borderColor: INK, borderWidth: 0.8 });
  } else {
    // keypad: 3x3 dots
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) page.drawCircle({ x: x + 2 + c * 3.2, y: y + r * 3.2, size: 0.9, color: INK });
  }
}

function drawCard(page: PDFPage, font: PDFFont, bold: PDFFont, mono: PDFFont, card: CardSecrets) {
  const m = 7 * MM;
  page.drawRectangle({ x: 3, y: 3, width: W - 6, height: H - 6, borderColor: INK, borderWidth: 0.6 });
  page.drawText(cardStrings.title, { x: m, y: H - m - 12, size: 15, font: bold, color: INK });
  page.drawText(`${cardStrings.idLabel} ${card.cardId}`, { x: m, y: H - m - 28, size: 12, font: mono, color: INK });
  const qr = 20 * MM;
  drawQr(page, card.cardId, W - m - qr, H - m - qr, qr);

  let y = H - m - qr - 14;
  cardStrings.steps.forEach((st, i) => {
    drawStepIcon(page, i, m, y - 1);
    page.drawText(`${st.number}. ${st.kr}`, { x: m + 15, y, size: 7.5, font: bold, color: INK });
    page.drawText(st.fr, { x: m + 15, y: y - 9, size: 7, font, color: INK });
    y -= 21;
  });

  y -= 4;
  page.drawLine({ start: { x: m, y: y + 8 }, end: { x: W - m, y: y + 8 }, thickness: 0.5, color: INK });
  const row = 10.6;
  card.codes.forEach((code, i) => {
    page.drawText(String(i + 1).padStart(2, "0"), { x: m, y, size: 9, font: bold, color: INK });
    page.drawText(groupCode(code), { x: m + 22, y, size: 10, font: mono, color: INK });
    y -= row;
  });
  page.drawLine({ start: { x: m, y: y + row - 3 }, end: { x: W - m, y: y + row - 3 }, thickness: 0.5, color: INK });
  page.drawText(cardStrings.renewalLabel, { x: m, y: y - 2, size: 8, font: bold, color: INK });
  page.drawText(groupCode(card.renewalCode), { x: m + 42, y: y - 2, size: 10, font: mono, color: INK });
}

/** One page per card. Used for a sender's single card and for the admin's print batch. */
export async function cardsPdf(cards: CardSecrets[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(cards.length === 1 ? `Transend card ${cards[0].cardId}` : `Transend cards (${cards.length})`);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);
  for (const card of cards) drawCard(doc.addPage([W, H]), font, bold, mono, card);
  return doc.save();
}
