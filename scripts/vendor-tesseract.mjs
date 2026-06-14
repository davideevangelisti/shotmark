// Vendor Tesseract's engine assets into public/tesseract/ so OCR runs fully
// self-hosted — required for the Manifest V3 extension (no remote code) and
// nicer for the web app (no third-party CDN fetch). Run once; commit the output.
import { cpSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "public/tesseract");
mkdirSync(out, { recursive: true });

const coreDir = resolve(root, "node_modules/tesseract.js-core");
// LSTM variants (oem 1) for plain / SIMD / relaxed-SIMD browsers.
const variants = ["lstm", "simd-lstm", "relaxedsimd-lstm"];
for (const v of variants) {
  for (const ext of ["js", "wasm", "wasm.js"]) {
    const f = `tesseract-core-${v}.${ext}`;
    cpSync(resolve(coreDir, f), resolve(out, f));
  }
}
cpSync(resolve(root, "node_modules/tesseract.js/dist/worker.min.js"), resolve(out, "worker.min.js"));

const langFile = resolve(out, "eng.traineddata.gz");
if (!existsSync(langFile)) {
  // "fast" model: ~2 MB vs ~23 MB, plenty accurate for screenshot text.
  const url = "https://tessdata.projectnaptha.com/4.0.0_fast/eng.traineddata.gz";
  console.log("downloading", url);
  const res = await fetch(url);
  if (!res.ok) throw new Error("traineddata download failed: " + res.status);
  writeFileSync(langFile, Buffer.from(await res.arrayBuffer()));
}

console.log("✓ vendored Tesseract assets → public/tesseract/");
