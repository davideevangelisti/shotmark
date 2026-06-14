// Generate the extension PNG icons (16/48/128) with a rounded "S" badge.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "extension/icons");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();

for (const size of [16, 48, 128]) {
  await page.setContent(`<canvas id="c" width="${size}" height="${size}"></canvas>`);
  const dataUrl = await page.evaluate((s) => {
    const c = document.getElementById("c");
    const x = c.getContext("2d");
    const r = Math.max(2, Math.round(s * 0.2));
    const g = x.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, "#2f81f7");
    g.addColorStop(1, "#238636");
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(r, 0);
    x.arcTo(s, 0, s, s, r);
    x.arcTo(s, s, 0, s, r);
    x.arcTo(0, s, 0, 0, r);
    x.arcTo(0, 0, s, 0, r);
    x.closePath();
    x.fill();
    x.fillStyle = "#ffffff";
    x.font = `bold ${Math.round(s * 0.64)}px Arial, sans-serif`;
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText("S", s / 2, s / 2 + s * 0.04);
    return c.toDataURL("image/png");
  }, size);
  writeFileSync(resolve(out, `icon${size}.png`), Buffer.from(dataUrl.split(",")[1], "base64"));
  console.log(`wrote icon${size}.png`);
}

await browser.close();
