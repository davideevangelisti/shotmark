# Shotmark — Chrome/Edge extension (unpacked testing)

The whole `extension/` folder is a loadable Manifest V3 extension. The `app/`
subfolder is the built Shotmark app (regenerate with `npm run build:ext`).

## Load it in Chrome (or Edge)

1. Rebuild after any code change: `npm run build:ext`
2. Open **chrome://extensions** (Edge: **edge://extensions**).
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select this folder:
   `products/shotmark/extension`
5. Pin the Shotmark icon from the puzzle-piece menu (optional).

## Use it

- Go to any normal web page, click the **Shotmark** toolbar icon — a popup opens
  with three choices:
  - **Capture visible area** — the current viewport.
  - **Capture full page** — scrolls and stitches the whole page into one image.
  - **Open editor** — empty, for paste / drag-drop / file.
- The editor opens with the screenshot loaded; annotate / redact / spotlight /
  beautify / export or copy to clipboard — all in-browser.
- Capture only works on normal web pages (not chrome://, the store, or PDFs).

## After changing code

Re-run `npm run build:ext`, then click the **↻ reload** icon on the Shotmark
card in chrome://extensions.

## Known limitation

OCR ("Extract text") is hidden in the extension for now — its engine assets
load from a CDN, which Manifest V3 disallows. It works in the web version;
self-hosting those assets for the extension is a tracked follow-up.
