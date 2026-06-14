# Shotmark

**Annotate, redact and beautify screenshots — entirely in your browser. Nothing
is uploaded.**

Blur or pixelate sensitive info, add arrows/boxes/text/numbered steps, spotlight
a region, frame it on a gradient backdrop, extract text (OCR), and export to
PNG/JPG/PDF or straight to the clipboard. Free, no sign-up, no subscription, and
your image never leaves your device.

Also ships as a **Chrome/Edge extension** with visible-area and full-page capture.

## Why it's different

- **Private by design** — all processing is local; no server ever sees your image.
- **No subscription** — built for one-time/free, not recurring billing.
- **Redaction that's real** — blur/pixelate is baked into the exported pixels.

## Use it

- Web app: open `index.html` via the dev server, or the deployed site's `/app/`.
- Extension: see [`extension/README.md`](extension/README.md) to load it unpacked.

## Develop

```bash
npm install
npm run dev          # web app at the Vite dev URL
npm test             # typecheck + unit (Vitest) + build + E2E (Playwright)
```

First-time setup for the bundled assets (already committed, regenerate if needed):

```bash
npm run icons             # extension icons
npm run vendor-tesseract  # self-hosted OCR engine -> public/tesseract/
```

## Build & ship

```bash
npm run build       # type-check + Vite build -> dist/
npm run build:ext   # bump version + package the extension -> extension/
npm run build:site  # landing page + app -> site-dist/  (deploy this)
```

Deployment (Cloudflare Pages / GitHub Pages, custom domain): see
[`DEPLOY.md`](DEPLOY.md).

## Architecture

- **`src/`** — TypeScript. `editor.ts` (Fabric.js canvas: tools, history, zoom,
  redaction, live backdrop, export), `ocr.ts` (Tesseract, self-hosted),
  `beautify.ts`, `exporter.ts`, `history.ts`, `util.ts`, `main.ts` (UI wiring).
- **`site/`** — marketing landing page.
- **`extension/`** — Manifest V3 wrapper (popup capture: scope × action).
- **`public/tesseract/`** — self-hosted OCR engine (no CDN; MV3-compliant).
- **`tests/`** — Vitest unit tests + Playwright E2E.

## Testing gate

Every change runs `npm test`: strict TypeScript, unit tests (history/export/
geometry/OCR-cleanup/manifest), a production build, and Playwright E2E that drive
a real browser — load an image, draw with the mouse, redact, undo/redo, zoom,
backdrop, OCR, and PDF export. The bar: don't ship crap.

Built by [@davideevangelisti](https://github.com/davideevangelisti) ·
🤖 with [Claude Code](https://claude.com/claude-code)
