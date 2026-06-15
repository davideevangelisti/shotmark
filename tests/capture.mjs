// One-off: render the app with a sample annotated screenshot and save a PNG to
// the gitignored .preview/ scratch dir (not a committed asset).
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

mkdirSync(".preview", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 760 } });
await page.goto("http://localhost:4317/");

// Build a realistic-looking fake "app window" screenshot to annotate.
const fixture = await page.evaluate(() => {
  const c = document.createElement("canvas");
  c.width = 720; c.height = 460;
  const x = c.getContext("2d");
  x.fillStyle = "#ffffff"; x.fillRect(0, 0, 720, 460);
  x.fillStyle = "#f3f4f6"; x.fillRect(0, 0, 720, 52);
  x.fillStyle = "#e5484d"; x.beginPath(); x.arc(20, 26, 6, 0, 7); x.fill();
  x.fillStyle = "#f5a623"; x.beginPath(); x.arc(42, 26, 6, 0, 7); x.fill();
  x.fillStyle = "#2ecc71"; x.beginPath(); x.arc(64, 26, 6, 0, 7); x.fill();
  x.fillStyle = "#111827"; x.font = "bold 22px sans-serif"; x.fillText("Account settings", 28, 100);
  x.fillStyle = "#6b7280"; x.font = "15px sans-serif";
  x.fillText("Email", 28, 150); x.fillText("API key", 28, 200); x.fillText("Plan", 28, 250);
  x.fillStyle = "#111827";
  x.fillText("jane@example.com", 160, 150);
  x.fillText("sk-live-9f2a7c4e1b88d3", 160, 200);
  x.fillText("Pro (annual)", 160, 250);
  x.strokeStyle = "#2f81f7"; x.lineWidth = 2; x.strokeRect(28, 300, 180, 44);
  x.fillStyle = "#2f81f7"; x.fillRect(28, 300, 180, 44);
  x.fillStyle = "#fff"; x.fillText("Save changes", 70, 327);
  return c.toDataURL("image/png");
});

await page.evaluate((u) => window.__shotmark.load(u), fixture);
await page.waitForSelector("#canvas-wrap:not([hidden])");

const box = await page.locator("#canvas").boundingBox();
const at = (px, py) => ({ x: box.x + px, y: box.y + py });

// Redact the API key (blur)
await page.click('.tool[data-tool="blur"]');
let p1 = at(160, 188), p2 = at(330, 210);
await page.mouse.move(p1.x, p1.y); await page.mouse.down();
await page.mouse.move(p2.x, p2.y, { steps: 4 }); await page.mouse.up();
await page.waitForTimeout(150);

// Arrow pointing at the Save button
await page.click('.tool[data-tool="arrow"]');
p1 = at(360, 250); p2 = at(220, 320);
await page.mouse.move(p1.x, p1.y); await page.mouse.down();
await page.mouse.move(p2.x, p2.y, { steps: 4 }); await page.mouse.up();

// Rectangle highlight around the email
await page.click('.tool[data-tool="rect"]');
p1 = at(150, 132); p2 = at(330, 162);
await page.mouse.move(p1.x, p1.y); await page.mouse.down();
await page.mouse.move(p2.x, p2.y, { steps: 4 }); await page.mouse.up();

// Turn on beautify so the canvas shows the gradient framing intent via panel
await page.evaluate(() => {
  document.querySelector("#b-enabled").checked = true;
  document.querySelector("#b-enabled").dispatchEvent(new Event("input", { bubbles: true }));
});
await page.click('.tool[data-tool="select"]');

await page.screenshot({ path: ".preview/editor.png" });
await browser.close();
console.log("wrote .preview/editor.png");
