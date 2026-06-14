// In-browser OCR via Tesseract.js (WASM). Runs entirely client-side — the
// image is never uploaded; Tesseract only fetches its own engine/lang assets.

import { createWorker } from "tesseract.js";

export interface OcrProgress { status: string; progress: number; }

export async function extractText(
  image: HTMLImageElement | HTMLCanvasElement | string,
  onProgress?: (p: OcrProgress) => void,
): Promise<string> {
  // Self-hosted engine assets (public/tesseract/), resolved relative to the
  // page so it works at /, at /app/ and inside the extension — no CDN, which
  // the Manifest V3 "no remote code" rule requires.
  const dir = new URL("tesseract/", document.baseURI).toString();
  const worker = await createWorker("eng", 1, {
    workerPath: dir + "worker.min.js",
    corePath: dir,
    langPath: dir,
    workerBlobURL: false,
    logger: onProgress ? (m: { status: string; progress: number }) =>
      onProgress({ status: m.status, progress: m.progress }) : undefined,
  });
  try {
    const { data } = await worker.recognize(image);
    return cleanText(data.text);
  } finally {
    await worker.terminate();
  }
}

/** Tidy raw OCR output: collapse blank runs, trim trailing spaces. Pure. */
export function cleanText(raw: string): string {
  return raw
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
