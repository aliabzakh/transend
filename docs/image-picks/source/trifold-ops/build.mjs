// Trifold piece 27-ops-map: the /ops satellite map with four numbered call-outs, in the
// devpost-clean style (no source lines, no explainer paragraph). Rendered at 300 dpi.
//
// usage: node capture-map.mjs map.png      (dev server on :3000; writes map.png and map.json)
//        node build.mjs <out dir>           (writes <out dir>/27-ops-map.png)
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../../..");
const OUT = resolve(process.argv[2] ?? join(ROOT, "docs/image-picks/4-trifold-pieces"));
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const DPI = 300, PX = 96;
const W_IN = 15.5, H_IN = 8.85;
const W = Math.round(W_IN * PX), H = Math.round(H_IN * PX);

const stats = JSON.parse(readFileSync(join(HERE, "map.json"), "utf8")).tiles;
const served = stats["Payouts served"].value;
const shops = stats["Shops low on cash"].sub.match(/\d+/)[0];

// The crop of map.png (4500 x 3150) that holds Haiti, and how wide it is drawn.
const CROP = { x: 225, y: 450, w: 4050, h: 2475 };
const MAP_W = 900;
const k = MAP_W / CROP.w;
const MAP_H = Math.round(CROP.h * k);
// Pins, in map.png pixels, and where each number sits (CSS px inside the map).
const pt = (x, y) => [(x - CROP.x) * k, (y - CROP.y) * k];
const CALLOUTS = [
  { n: 1, pin: pt(3589, 1451), badge: [830, 160], r: 22 },
  { n: 2, pin: pt(2750, 770), badge: [650, 22], r: 18 },
  { n: 3, pin: pt(1948, 940), badge: [262, 168], r: 26 },
];

const NIGHT = "#0B1A13", FG = "#F3F5F0", MUTED = "#A8B8AE", LEAF = "#2FCB7A", GOLD = "#E0A526", LINE = "#2A3D33";
const font = (w) => `@font-face{font-family:Satoshi;font-weight:${w};src:url("file://${ROOT}/web/public/fonts/satoshi-${w}.woff2")}`;

const badge = (n, size = 46) =>
  `<span class="badge" style="width:${size}px;height:${size}px">${n}</span>`;

const overlay = `<svg class="lines" width="${MAP_W}" height="${MAP_H}" viewBox="0 0 ${MAP_W} ${MAP_H}">
${CALLOUTS.map(({ pin: [px, py], badge: [bx, by], r }) => {
  // Stop the line at the ring's edge.
  const dx = px - bx, dy = py - by, d = Math.hypot(dx, dy);
  return `<line x1="${bx}" y1="${by}" x2="${px - (dx / d) * r}" y2="${py - (dy / d) * r}" stroke="${FG}" stroke-width="3" stroke-linecap="round"/>`;
}).join("")}
</svg>${CALLOUTS.map(({ n, badge: [bx, by] }) => `<div class="pinbadge" style="left:${bx - 23}px;top:${by - 23}px">${badge(n)}</div>`).join("")}`;

const items = [
  [1, "Cash vs ceiling", "Each ring fills with cash"],
  [2, "Real shops", `3 real · ${shops - 3} simulated`],
  [3, "Shop top-ups", "Owners refill their cash"],
];

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${font(400)}${font(500)}${font(700)}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:${NIGHT}}
body{font-family:Satoshi,system-ui,sans-serif;color:${FG};-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums}
.root{width:${W}px;height:${H}px;padding:56px 64px 0;position:relative}
.kick{color:${GOLD};font-weight:700;font-size:32px;letter-spacing:.14em;text-transform:uppercase}
h1{font-size:70px;font-weight:700;letter-spacing:-.03em;line-height:1;margin-top:14px;white-space:nowrap}
h1 em{font-style:normal;color:${LEAF}}
.body{display:flex;gap:44px;margin-top:40px}
.map{position:relative;width:${MAP_W}px;height:${MAP_H}px;border-radius:26px;overflow:hidden;flex:none;
  box-shadow:0 0 0 5px ${LINE}}
.map img{position:absolute;left:${-CROP.x * k}px;top:${-CROP.y * k}px;width:${4500 * k}px;height:${3150 * k}px}
.lines{position:absolute;inset:0}
.pinbadge{position:absolute}
.badge{display:inline-flex;align-items:center;justify-content:center;flex:none;border-radius:50%;
  background:${FG};color:${NIGHT};font-weight:700;font-size:30px;box-shadow:0 0 0 4px rgba(11,26,19,.75)}
.list{display:flex;flex-direction:column;justify-content:space-between;flex:1;min-width:0;height:${MAP_H}px}
.item{display:flex;gap:20px;align-items:flex-start}
.item h3{white-space:nowrap;font-size:40px;font-weight:700;letter-spacing:-.02em;line-height:1.05}
.item p{white-space:nowrap;font-size:32px;color:${MUTED};line-height:1.2;margin-top:6px}
.fc{border-top:3px solid ${LINE};padding-top:22px}
.fc .big{font-size:96px;font-weight:700;letter-spacing:-.04em;line-height:.9;color:${LEAF}}
.fc p{font-size:32px;color:${MUTED};line-height:1.2;margin-top:12px}
.fc p b{color:${FG};font-weight:700}
.credit{position:absolute;left:64px;bottom:20px;font-size:16px;color:#6f8379}
</style></head><body><div class="root">
<div class="kick">Operations map · live at /ops</div>
<h1>Every shop's cash, <em>on one map.</em></h1>
<div class="body">
  <div class="map"><img src="file://${HERE}/map.png" alt="">${overlay}</div>
  <div class="list">
    ${items.map(([n, t, s]) => `<div class="item">${badge(n)}<div><h3>${t}</h3><p>${s}</p></div></div>`).join("")}
    <div class="fc"><div class="big">${served}</div>
      <p>of payouts served. <b>AI forecast</b> sets each cash ceiling.</p></div>
  </div>
</div>
<div class="credit">Sample data. Imagery © Esri, Maxar, Earthstar Geographics</div>
</div></body></html>`;

mkdirSync(join(HERE, "html"), { recursive: true });
const page = join(HERE, "html", "27-ops-map.html");
writeFileSync(page, html);
mkdirSync(OUT, { recursive: true });
const png = join(OUT, "27-ops-map.png");
execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
  `--force-device-scale-factor=${DPI / PX}`, `--window-size=${W},${H}`, "--virtual-time-budget=6000",
  `--screenshot=${png}`, "file://" + page], { stdio: "ignore" });
console.log("rendered 27-ops-map", W_IN, "x", H_IN, "in ->", png);
