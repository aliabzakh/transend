/**
 * Turns the designed card (docs/brand/cards/transend_card_{front,back}.svg) into the
 * template the app prints every card on: web/lib/cards/template.generated.ts.
 *
 * The back SVG carries a sample card (ID TS4F2K9Q, 20 codes, a renewal code and a QR).
 * This script removes those, records where each one sat, and prints both sides to a
 * two-page vector PDF with headless Chrome. lib/cards/pdf.ts then draws each real card's
 * ID, QR, codes and renewal code in those places.
 *
 * Usage: npm run cards:template   (after the designer changes either SVG)
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = join(ROOT, "docs/brand/cards");
const OUT = join(ROOT, "web/lib/cards/template.generated.ts");
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/** The card's mono face: its glyph IDs start with this prefix in the back SVG. */
const MONO = "font_2";
/** Every QR module in the back SVG is a path with this transform. */
const QR_TRANSFORM = "matrix(.5,0,0,-.5,226.7717,73.700778)";

type Glyph = { raw: string; text: string; font: string; size: number; x: number; y: number; fill: string };

const GLYPH = /<use data-text="([^"]*)" xlink:href="#(font_\d+)_\d+" transform="matrix\(([-\d.]+),0,0,[-\d.]+,([-\d.]+),([-\d.]+)\)" fill="([^"]+)"\/>\n?/g;

function glyphs(svg: string): Glyph[] {
  return [...svg.matchAll(GLYPH)].map((m) => ({
    raw: m[0],
    text: m[1],
    font: m[2],
    size: Number(m[3]),
    x: Number(m[4]),
    y: Number(m[5]),
    fill: m[6],
  }));
}

/** Splits glyphs on one baseline into runs wherever the gap is wider than two characters. */
function runs(gs: Glyph[]): Glyph[][] {
  const sorted = [...gs].sort((a, b) => a.x - b.x);
  const out: Glyph[][] = [];
  for (const g of sorted) {
    const last = out.at(-1)?.at(-1);
    if (last && g.x - last.x <= g.size * 0.6 * 2.5) out.at(-1)!.push(g);
    else out.push([g]);
  }
  return out;
}

const text = (r: Glyph[]) => r.map((g) => g.text).join("");
const r2 = (n: number) => Math.round(n * 100) / 100;

const front = readFileSync(join(SRC, "transend_card_front.svg"), "utf8");
let back = readFileSync(join(SRC, "transend_card_back.svg"), "utf8");

const size = back.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
if (!size) throw new Error("back SVG has no viewBox");
const W = Number(size[1]);
const H = Number(size[2]);

// --- find the sample card's dynamic parts ---------------------------------
const mono = glyphs(back).filter((g) => g.font === MONO);
const byLine = new Map<number, Glyph[]>();
for (const g of mono) byLine.set(r2(g.y), [...(byLine.get(r2(g.y)) ?? []), g]);
const lines = [...byLine.entries()].sort((a, b) => a[0] - b[0]).map(([, gs]) => runs(gs));

// First line: "ID  TS4F2K9Q". Keep the label, replace the value (everything after the spaces).
const [idLine, ...rest] = lines;
const idGlyphs = idLine.flat();
const firstSpace = idGlyphs.findIndex((g) => g.text === " ");
const idRun = idGlyphs.slice(firstSpace).filter((g, i, all) => all.slice(0, i + 1).some((h) => h.text !== " "));
if (text(idGlyphs.slice(0, firstSpace)) !== "ID" || !/^TS[0-9A-Z]{6}$/.test(text(idRun))) {
  throw new Error(`unexpected ID line: ${text(idGlyphs)}`);
}
// Then 10 rows of two codes, then the renewal code.
const codeRows = rest.slice(0, 10);
const renewalLine = rest[10];
if (codeRows.some((r) => r.length !== 2) || renewalLine?.length !== 1 || rest.length !== 11) {
  throw new Error(`unexpected code layout: ${rest.map((l) => l.map(text).join(" | ")).join("\n")}`);
}
const left = codeRows.map((r) => r[0]);
const right = codeRows.map((r) => r[1]);
const codeRuns = [...left, ...right]; // printed lines 01-10 are the left column, 11-20 the right
const renewalRun = renewalLine[0];

const at = (r: Glyph[]) => ({ x: r2(r[0].x), y: r2(H - r[0].y), size: r[0].size, color: r[0].fill });

// QR: the bounding box of the dark modules, in PDF points (y up).
const qrPaths = [...back.matchAll(new RegExp(`<path transform="${QR_TRANSFORM.replace(/[().]/g, "\\$&")}" d="([^"]+)"[^>]*\\/>\\n?`, "g"))];
if (qrPaths.length < 50) throw new Error("QR modules not found in the back SVG");
// Each module is a rectangle "M x1 y1 H x2 V y2 H x1 Z".
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
for (const m of qrPaths) {
  const d = m[1].match(/M([\d.]+) ([\d.]+)H([\d.]+)V([\d.]+)/);
  if (!d) throw new Error(`unexpected QR path ${m[1]}`);
  const [x1, y1, x2, y2] = d.slice(1).map(Number);
  minX = Math.min(minX, x1, x2); maxX = Math.max(maxX, x1, x2);
  minY = Math.min(minY, y1, y2); maxY = Math.max(maxY, y1, y2);
}
const [sx, , , sy, tx, ty] = QR_TRANSFORM.match(/[-\d.]+/g)!.map(Number);
// SVG point (x, y) -> page (tx + sx*x, ty + sy*y), then PDF y = H - svgY. sy is negative (flipped).
const svgTop = Math.min(ty + sy * minY, ty + sy * maxY);
const qr = {
  x: r2(tx + sx * minX),
  /** The QR's top edge (PDF y). */
  top: r2(H - svgTop),
  size: r2(sx * (maxX - minX)),
  color: qrPaths[0][0].match(/fill="([^"]+)"/)![1],
};

// --- strip them from the back ----------------------------------------------
for (const g of [...idRun, ...codeRuns.flat(), ...renewalRun]) back = back.replace(g.raw, "");
for (const m of qrPaths) back = back.replace(m[0], "");
const leftover = glyphs(back).filter((g) => g.font === MONO).map((g) => g.text).join("");
if (leftover.trim() !== "ID") throw new Error(`mono glyphs left on the back: ${leftover}`);

// --- print both sides to PDF -------------------------------------------------
// Prefix glyph IDs so the two SVGs can share one HTML page.
const inline = (svg: string, p: string) =>
  svg.replace(/<\?xml[^>]*>/, "").replace(/(id="|#)font_/g, `$1${p}font_`).replace(/width="[^"]+" height="[^"]+"/, `width="${W}pt" height="${H}pt"`);
const html = `<!doctype html><meta charset="utf-8"><style>
@page { size: ${W}pt ${H}pt; margin: 0 }
html, body { margin: 0 }
svg { display: block; break-after: page }
</style>${inline(front, "f")}${inline(back, "b")}`;
const dir = mkdtempSync(join(tmpdir(), "transend-card-"));
writeFileSync(join(dir, "card.html"), html);
// A copy of the stripped back, for checking by eye.
writeFileSync(join(dir, "back-template.svg"), back);
const pdfPath = join(dir, "card.pdf");
execFileSync(CHROME, [
  "--headless=new",
  "--disable-gpu",
  "--no-pdf-header-footer",
  `--print-to-pdf=${pdfPath}`,
  `file://${join(dir, "card.html")}`,
], { stdio: "ignore" });
const pdf = readFileSync(pdfPath);

const layout = {
  width: r2(W),
  height: r2(H),
  id: at(idRun),
  codes: codeRuns.map((r) => ({ x: r2(r[0].x), y: r2(H - r[0].y) })),
  code: { size: left[0][0].size, color: left[0][0].fill },
  renewal: at(renewalRun),
  qr,
};

writeFileSync(
  OUT,
  `// Generated by scripts/cards/build-template.ts from docs/brand/cards/*.svg. Do not edit.
// Rebuild with \`npm run cards:template\` after changing the SVGs.

/** Where pdf.ts draws each card's own parts, in PDF points (origin bottom-left). */
export const CARD_LAYOUT = ${JSON.stringify(layout, null, 2)} as const;

/** Two A6 pages: the front, then the back without the sample ID, QR and codes. */
export const CARD_TEMPLATE_PDF = "${pdf.toString("base64")}";
`,
);
console.log(`template: ${(pdf.length / 1024).toFixed(0)} KB, ${dir}`);
console.log(JSON.stringify(layout));
