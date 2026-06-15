// Generate brand icons: extension sizes (16/48/128) + a polished 128 store icon.
// Each is rendered at 4× then downscaled for crisp edges. On-brand gradient with
// a white "S" and a subtle marker-stroke accent (a nod to annotation).
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = resolve(root, "extension/icons");
const promoDir = resolve(root, "promo");
mkdirSync(iconsDir, { recursive: true });
mkdirSync(promoDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();

async function renderIcon(size, markerAccent) {
  await page.setContent('<canvas id="c"></canvas>');
  const dataUrl = await page.evaluate(({ size, markerAccent }) => {
    const SS = size * 4; // supersample
    const c = document.getElementById("c");
    c.width = SS; c.height = SS;
    const x = c.getContext("2d");
    // rounded-square gradient background
    const r = SS * 0.22;
    const g = x.createLinearGradient(0, 0, SS, SS);
    g.addColorStop(0, "#2f81f7");
    g.addColorStop(1, "#238636");
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(r, 0);
    x.arcTo(SS, 0, SS, SS, r); x.arcTo(SS, SS, 0, SS, r);
    x.arcTo(0, SS, 0, 0, r); x.arcTo(0, 0, SS, 0, r);
    x.closePath(); x.fill();
    // marker-stroke accent (annotation nod) — only on larger sizes
    if (markerAccent) {
      x.strokeStyle = "rgba(255,59,48,0.92)";
      x.lineWidth = SS * 0.09;
      x.lineCap = "round";
      x.beginPath();
      x.moveTo(SS * 0.30, SS * 0.72);
      x.lineTo(SS * 0.70, SS * 0.72);
      x.stroke();
    }
    // white S
    x.fillStyle = "#ffffff";
    x.font = `bold ${Math.round(SS * 0.6)}px -apple-system, Arial, sans-serif`;
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText("S", SS / 2, SS * (markerAccent ? 0.46 : 0.5) + SS * 0.02);
    // downscale to target size
    const out = document.createElement("canvas");
    out.width = size; out.height = size;
    const ox = out.getContext("2d");
    ox.imageSmoothingQuality = "high";
    ox.drawImage(c, 0, 0, size, size);
    return out.toDataURL("image/png");
  }, { size, markerAccent });
  return Buffer.from(dataUrl.split(",")[1], "base64");
}

// extension icons: accent only on 48/128 (16 is too small for it to read)
for (const size of [16, 48, 128]) {
  writeFileSync(resolve(iconsDir, `icon${size}.png`), await renderIcon(size, size >= 48));
  console.log(`wrote icon${size}.png`);
}
// store icon (128, with accent)
writeFileSync(resolve(promoDir, "store-icon-128.png"), await renderIcon(128, true));
console.log("wrote promo/store-icon-128.png");

await browser.close();
