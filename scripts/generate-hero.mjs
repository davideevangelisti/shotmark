// Generate the landing-page hero image: a realistic screenshot annotated and
// beautified BY Shotmark itself (the actual export), so the hero shows the real
// output. Requires `npm run preview` running on :4317.
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
await page.goto("http://localhost:4317/");

const fixture = await page.evaluate(() => {
  const c = document.createElement("canvas");
  c.width = 760; c.height = 480;
  const x = c.getContext("2d");
  x.fillStyle = "#ffffff"; x.fillRect(0, 0, 760, 480);
  x.fillStyle = "#f3f4f6"; x.fillRect(0, 0, 760, 54);
  ["#e5484d", "#f5a623", "#2ecc71"].forEach((c2, i) => { x.fillStyle = c2; x.beginPath(); x.arc(22 + i * 22, 27, 6, 0, 7); x.fill(); });
  x.fillStyle = "#111827"; x.font = "bold 24px sans-serif"; x.fillText("Account settings", 30, 104);
  x.fillStyle = "#6b7280"; x.font = "16px sans-serif";
  x.fillText("Email", 30, 158); x.fillText("API key", 30, 212); x.fillText("Plan", 30, 266);
  x.fillStyle = "#111827";
  x.fillText("jane@example.com", 170, 158);
  x.fillText("sk-live-9f2a7c4e1b88d3a0", 170, 212);
  x.fillText("Pro (annual)", 170, 266);
  x.fillStyle = "#2f81f7"; x.fillRect(30, 320, 190, 46);
  x.fillStyle = "#fff"; x.fillText("Save changes", 74, 349);
  return c.toDataURL("image/png");
});

await page.evaluate((u) => window.__shotmark.load(u), fixture);
await page.waitForSelector("#canvas-wrap:not([hidden])");

const box = await page.locator("#canvas").boundingBox();
const at = (px, py) => ({ x: box.x + px, y: box.y + py });

// blur the API key
await page.click('.tool[data-tool="blur"]');
let a = at(168, 198), b = at(360, 222);
await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 4 }); await page.mouse.up();
await page.waitForTimeout(150);
// box the email
await page.click('.tool[data-tool="rect"]');
a = at(160, 140); b = at(360, 170);
await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 4 }); await page.mouse.up();
// arrow to the button
await page.click('.tool[data-tool="arrow"]');
a = at(380, 265); b = at(235, 343);
await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 4 }); await page.mouse.up();

// beautify + export the real output
const dataUrl = await page.evaluate(async () => {
  const e = window.__shotmark.editor;
  e.beautify.enabled = true; e.beautify.padding = 70; e.beautify.background = "grape"; e.beautify.shadow = 40;
  e.applyBackdrop();
  return e.export("png", 2);
});
writeFileSync(resolve(root, "site/hero.png"), Buffer.from(dataUrl.split(",")[1], "base64"));
await browser.close();
console.log("wrote site/hero.png");
