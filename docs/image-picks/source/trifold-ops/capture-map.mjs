// Captures the /ops satellite map alone (panels, header and controls hidden) at print resolution.
// usage: node capture-map.mjs <out.png> [base url]   (needs the web dev server and Google Chrome)
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const OUT = process.argv[2];
const BASE = process.argv[3] ?? "http://localhost:3000";
const W = 1500, H = 1050, SCALE = 3, PORT = 9339;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const css = `
.ops{grid-template-columns:0 1fr 0!important;grid-template-rows:0 1fr 0!important}
.ops-head,.ops-left,.ops-right,.ops-timeline,.ops-map-legend,.maplibregl-ctrl,.ops-pin-label,nextjs-portal{display:none!important}
.ops-pin>*,.ops-pin::before{transform:scale(2.2)}`;

const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "ops-cap-"))}`,
  "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 40 && !target; i++) {
  await sleep(250);
  try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((t) => t.type === "page"); } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const waits = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (waits.has(m.id)) { waits.get(m.id)(m); waits.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const n = ++id; waits.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });

await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: SCALE, mobile: false });
await send("Page.addScriptToEvaluateOnNewDocument", { source:
  `document.addEventListener("DOMContentLoaded",()=>{const s=document.createElement("style");s.textContent=${JSON.stringify(css)};document.head.appendChild(s)})` });
await send("Page.navigate", { url: BASE + "/ops" });
// Wait for the pins, then for the imagery tiles to settle.
for (let i = 0; i < 120; i++) {
  const r = await send("Runtime.evaluate", { expression: "document.querySelectorAll('.ops-pin').length", returnByValue: true });
  if (r.result.result.value > 0) break;
  await sleep(500);
}
// Play the week until a few shopkeepers are topping up, then pause there.
await send("Runtime.evaluate", { expression: "document.querySelector('.ops-play').click()" });
for (let i = 0; i < 240; i++) {
  await sleep(150);
  const r = await send("Runtime.evaluate", { expression: "document.querySelectorAll('.ops-pin[data-topup=\"1\"]').length", returnByValue: true });
  const n = r.result.result.value;
  if (n >= 2 && n <= 4 && i > 10) break;
}
await send("Runtime.evaluate", { expression: "document.querySelector('.ops-play').click()" });
await sleep(9000);
// The numbers beside the map come from the same page, at the same playhead.
const stats = await send("Runtime.evaluate", { returnByValue: true, expression: `JSON.stringify({
  clock: document.querySelector('.ops-clock')?.textContent,
  topups: document.querySelectorAll('.ops-pin[data-topup="1"]').length,
  tiles: Object.fromEntries([...document.querySelectorAll('.ops-tile')].map(t => [
    t.querySelector('.ops-tile-label').firstChild.textContent,
    { value: t.querySelector('.ops-tile-value')?.textContent, sub: t.querySelector('.ops-tile-sub')?.textContent }]))
})` });
await writeFile(OUT.replace(/\.png$/, ".json"), JSON.stringify(JSON.parse(stats.result.result.value), null, 1));
const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
await writeFile(OUT, Buffer.from(shot.result.data, "base64"));
console.log("saved", OUT, `${W * SCALE}x${H * SCALE}`);
ws.close(); chrome.kill();
