// Generate the landing hero: the FULL Shotmark UI in editing mode (left tool
// pane + canvas with a real annotated screenshot). Requires `npm run preview`.
import { chromium } from "@playwright/test";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const browser = await chromium.launch({ deviceScaleFactor: 2 });
const page = await browser.newPage({ viewport: { width: 1320, height: 840 } });
await page.goto("http://localhost:4317/");

const fixture = await page.evaluate(() => {
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
await page.evaluate((u) => window.__shotmark.load(u), fixture);
await page.waitForSelector("#canvas-wrap:not([hidden])");

const box = await page.locator("#canvas").boundingBox();
const at = (px, py) => ({ x: box.x + px, y: box.y + py });
const drag = async (tool, a, b) => {
  await page.click(`.tool[data-tool="${tool}"]`);
  const p1 = at(a[0], a[1]), p2 = at(b[0], b[1]);
  await page.mouse.move(p1.x, p1.y); await page.mouse.down();
  await page.mouse.move(p2.x, p2.y, { steps: 4 }); await page.mouse.up();
};
await drag("blur", [172, 214], [400, 246]); await page.waitForTimeout(300);
await drag("rect", [170, 154], [392, 188]);
await drag("arrow", [430, 360], [250, 372]);

// a touch of colour, deselect, fit, and shoot the whole window
await page.selectOption("#b-bg", "ocean");
await page.locator("#b-enabled").check();
await page.evaluate(() => {
  const e = window.__shotmark.editor;
  e.canvas.discardActiveObject(); e.canvas.renderAll();
  const s = document.querySelector("#stage");
  e.fit(s.clientWidth - 60, s.clientHeight - 60);
});
await page.waitForTimeout(300);
await page.screenshot({ path: resolve(root, "site/hero.png") });

await browser.close();
console.log("wrote site/hero.png (full UI)");
