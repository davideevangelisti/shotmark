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

- Go to any normal web page, click the **Shotmark** toolbar icon — a clean popup
  offers a **scope × action** grid:
  - Scope: **Visible area** or **Full page** (scrolls + stitches the whole page).
  - Action: **Copy** (straight to clipboard), **Edit** (open the editor), or
    **PNG** (download immediately).
- Copy and PNG happen instantly with no editor step; Edit opens the full
  annotator (redact / spotlight / beautify / OCR / export).
- Capture only works on normal web pages (not chrome://, the store, or PDFs).

## After changing code

Re-run `npm run build:ext`, then click the **↻ reload** icon on the Shotmark
card in chrome://extensions.

## Known limitation

OCR ("Extract text") is hidden in the extension for now — its engine assets
load from a CDN, which Manifest V3 disallows. It works in the web version;
self-hosting those assets for the extension is a tracked follow-up.
