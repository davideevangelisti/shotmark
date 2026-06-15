# Chrome Web Store submission kit — Shotmark

Everything to paste into the listing once the developer account is verified.
Build + package first:

```bash
npm run build:ext   # builds + bumps version
npm run pack:zip    # -> shotmark-extension-v<version>.zip  (upload this)
```

Edge Add-ons: same ZIP, free, no registration fee — submit there too.

---

## Listing fields

**Name:** Shotmark — Screenshot Annotator

**Summary (≤132 chars):**
Annotate, blur/redact, spotlight and beautify screenshots — all in your browser. Nothing is uploaded.

**Category:** Productivity

**Language:** English

**Detailed description:**
> Mark up screenshots and hide what's private — without uploading anything.
>
> Shotmark captures the visible area or a full, scrolling page, then lets you:
> • Blur or pixelate sensitive info (API keys, emails, faces)
> • Add arrows, boxes, circles, lines, freehand pen, highlighter, text and numbered steps
> • Spotlight a region to dim everything else
> • Beautify: drop your shot on a gradient backdrop with padding, rounded corners and a shadow
> • Extract text from the image (built-in OCR)
> • Export as PNG, JPG or PDF, or copy straight to the clipboard
>
> Private by design: every pixel is processed locally in your browser. Your image
> is never uploaded to any server. No account, no sign-up, no subscription.
>
> Open source: https://github.com/davideevangelisti/shotmark

**Privacy policy URL:** https://shotmark.davide-evangelisti.workers.dev/privacy.html

**Homepage URL:** https://shotmark.davide-evangelisti.workers.dev/

(Update both if/when a custom domain is attached.)

---

## Permission justifications (the store asks for each)

- **activeTab** — capture the tab the user is on, only when they click the icon.
- **scripting** — scroll the page to capture a full-page screenshot.
- **downloads** — save the screenshot as a PNG when the user picks "PNG".
- **clipboardWrite** — copy the screenshot to the clipboard when they pick "Copy".
- **storage** — briefly hand the captured image from the popup to the editor tab; removed after use.
- **No host permissions** beyond activeTab; **no remote code** (OCR engine is bundled).

## Data-use declarations (Privacy practices form)

- Does it collect user data? **No.**
- Remote code? **No** (all scripts and the WASM OCR engine are packaged).
- Tick the certification that usage complies with the Developer Program Policies.

---

## Assets

- **Store icon:** 128×128 — `extension/icons/icon128.png` ✓
- **Screenshots:** 1280×800 (or 640×400), at least one. Generate with:
  `npm run promo` → `promo/` (see scripts/generate-promo.mjs).
- **Small promo tile (optional):** 440×280.

## Pre-submit checklist

- [ ] `npm test` green
- [ ] Manually test: visible + full-page capture, Copy, PNG, Edit, OCR in the extension
- [ ] Site deployed so the privacy + homepage URLs resolve
- [ ] `npm run pack:zip` → upload the ZIP
- [ ] Fill privacy practices form (no data collected; no remote code)
