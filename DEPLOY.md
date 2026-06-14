# Deploying Shotmark (landing page + app)

`npm run build:site` produces **`site-dist/`** — a fully static site:
`/` = landing page, `/app/` = the Shotmark web app. Host it anywhere static.
No backend, no env vars, no secrets.

## Option A — Cloudflare Pages (recommended)

Free, global CDN, free privacy-friendly analytics, easy custom domain.

**One-time setup (needs your Cloudflare login — do this when not on the move):**
1. Push this repo to GitHub (already on `github.com/davideevangelisti`).
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git** → pick the `portfolioManager`/autoforge repo.
3. Build settings:
   - **Framework preset:** None
   - **Build command:** `cd products/shotmark && npm ci && npm run build:site`
   - **Build output directory:** `products/shotmark/site-dist`
4. Deploy. You get `https://<project>.pages.dev` immediately.

Every `git push` redeploys automatically.

**Alternative (no Git, fastest): direct upload with Wrangler**
```bash
npm i -g wrangler
cd products/shotmark && npm run build:site
wrangler pages deploy site-dist --project-name shotmark
```
(First run opens a browser to log in to Cloudflare.)

## Option B — GitHub Pages (fallback)

```bash
npm run build:site
# publish products/shotmark/site-dist to a gh-pages branch (e.g. via
# `npx gh-pages -d site-dist`) or point Pages at it in repo settings.
```
URL: `https://davideevangelisti.github.io/<repo>/` — note the subpath; the
landing links are relative so they work under a subpath too.

## Custom domain (later, optional, ~€12/yr)

1. Buy a domain (umbrella e.g. `forgetools.dev` with `shotmark.` subdomain, or a
   dedicated `shotmark.app`).
2. Cloudflare Pages → project → **Custom domains** → add it; Cloudflare walks you
   through the DNS records. HTTPS is automatic.
3. Update `<link rel="canonical">` and `og:image` URLs in `site/index.html`.

Launching on `*.pages.dev` first and attaching the domain within a few days
loses no meaningful SEO.

## Before public launch (checklist)

- [ ] Run the full test gate: `npm test`
- [ ] Manually test the extension build (`npm run build:ext`)
- [ ] Decide brand/domain and update canonical/OG URLs
- [ ] Add an analytics snippet (Cloudflare Web Analytics — privacy-friendly)
- [ ] Add a feedback link (mailto or a form) to the landing page
- [ ] Self-host OCR assets before submitting the extension to the store
