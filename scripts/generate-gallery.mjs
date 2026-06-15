// Generate the landing-page feature gallery. Requires `npm run preview` on :4317.
// Produces site/gallery/*.png — one clean image per main function.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const gdir = resolve(root, "site/gallery");
mkdirSync(gdir, { recursive: true });

const browser = await chromium.launch({ deviceScaleFactor: 2 });
const page = await browser.newPage({ viewport: { width: 1200, height: 820 } });
await page.goto("http://localhost:4317/");

function sampleImage() {
  return page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 820; c.height = 520;
    const x = c.getContext("2d");
    x.fillStyle = "#ffffff"; x.fillRect(0, 0, 820, 520);
    x.fillStyle = "#f3f4f6"; x.fillRect(0, 0, 820, 56);
    ["#e5484d", "#f5a623", "#2ecc71"].forEach((c2, i) => { x.fillStyle = c2; x.beginPath(); x.arc(24 + i * 22, 28, 6, 0, 7); x.fill(); });
    x.fillStyle = "#111827"; x.font = "bold 26px sans-serif"; x.fillText("Account settings", 32, 112);
    x.fillStyle = "#6b7280"; x.font = "17px sans-serif";
    x.fillText("Email", 32, 172); x.fillText("API key", 32, 230); x.fillText("Plan", 32, 288);
    x.fillStyle = "#111827";
    x.fillText("jane@example.com", 180, 172);
    x.fillText("sk-live-9f2a7c4e1b88d3a0", 180, 230);
    x.fillText("Pro (annual)", 180, 288);
    x.fillStyle = "#2f81f7"; x.fillRect(32, 344, 200, 48);
    x.fillStyle = "#fff"; x.fillText("Save changes", 78, 374);
    return c.toDataURL("image/png");
  });
}

async function reset() {
  await page.evaluate(() => { const e = window.__shotmark.editor; e.beautify.enabled = false; e.applyBackdrop?.(); });
  const u = await sampleImage();
  await page.evaluate((d) => window.__shotmark.load(d), u);
  await page.waitForSelector("#canvas-wrap:not([hidden])");
}
async function box() { return page.locator("#canvas").boundingBox(); }
async function drag(tool, a, b) {
  const bx = await box();
  await page.click(`.tool[data-tool="${tool}"]`);
  await page.mouse.move(bx.x + a[0], bx.y + a[1]); await page.mouse.down();
  await page.mouse.move(bx.x + b[0], bx.y + b[1], { steps: 4 }); await page.mouse.up();
}
async function deselect() {
  await page.evaluate(() => { const e = window.__shotmark.editor; e.canvas.discardActiveObject(); e.canvas.renderAll(); });
  await page.waitForTimeout(150); // let the selection handles clear before the shot
}
async function shotCanvas(name) { await deselect(); await page.locator("#canvas-wrap").screenshot({ path: resolve(gdir, name) }); }

// 1. Redact — fully cover the value text (redaction is async; let it settle)
await reset();
await drag("blur", [172, 214], [400, 246]);     // API key
await page.waitForTimeout(300);
await drag("pixelate", [172, 156], [350, 188]);  // email
await page.waitForTimeout(400);
await shotCanvas("redact.png");

// 2. Annotate
await reset();
await drag("rect", [170, 154], [392, 188]);
await drag("arrow", [430, 360], [250, 372]);
await page.evaluate(() => { const e = window.__shotmark.editor; e.setTool("badge"); });
let bx = await box();
await page.mouse.click(bx.x + 420, bx.y + 168);
await shotCanvas("annotate.png");

// 3. Spotlight
await reset();
await drag("spotlight", [150, 150], [410, 250]);
await shotCanvas("spotlight.png");

// 4. Beautify
await reset();
await drag("rect", [170, 154], [392, 188]);
await page.selectOption("#b-bg", "ocean");
await page.locator("#b-enabled").check();
await shotCanvas("beautify.png");

// 5. OCR
await reset();
await page.click("#ocr");
await page.waitForFunction(() => document.querySelector("#ocr-text").value.length > 0, null, { timeout: 60000 });
await page.screenshot({ path: resolve(gdir, "ocr.png"), clip: { x: 240, y: 70, width: 940, height: 600 } });

// 6. Capture menu (the extension popup)
const pop = await browser.newPage({ viewport: { width: 300, height: 350 }, deviceScaleFactor: 2 });
await pop.goto("file://" + resolve(root, "extension/popup.html"));
await pop.waitForTimeout(250);
await pop.screenshot({ path: resolve(gdir, "capture.png") });
await pop.close();

await browser.close();
console.log("wrote site/gallery/*.png");
