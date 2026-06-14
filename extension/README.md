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

- Go to any normal web page, click the **Shotmark** toolbar icon.
- It captures the visible tab and opens the editor with the screenshot loaded.
- Annotate / redact / beautify / export or copy to clipboard — all in-browser.
- On pages that can't be captured (chrome://, the store, PDFs) the editor opens
  empty; paste (⌘/Ctrl+V), drag-drop, or pick a file instead.

## After changing code

Re-run `npm run build:ext`, then click the **↻ reload** icon on the Shotmark
card in chrome://extensions.

## Known limitation

OCR ("Extract text") is hidden in the extension for now — its engine assets
load from a CDN, which Manifest V3 disallows. It works in the web version;
self-hosting those assets for the extension is a tracked follow-up.
