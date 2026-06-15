# Shotmark — Operations runbook

The single reference for **deploying** (Cloudflare) and **publishing**
(Chrome Web Store / Edge). Written so anyone — the owner or any coding agent —
can do it cold. No secrets are stored in this repo; this explains where they
live and how to recreate them.

- Live site: **https://shotmark.davide-evangelisti.workers.dev/** (`/` landing, `/app/` tool, `/privacy` policy)
- Public repo: **https://github.com/davideevangelisti/shotmark**
- Listing copy & permission justifications: **[STORE.md](STORE.md)**

## Repo layout reminder

This product lives at `products/shotmark` inside the private **autoforge**
monorepo. The public GitHub repo is a **subtree export** of that folder. To
update the public repo after committing in autoforge:

```bash
cd <autoforge-root>
git subtree split --prefix=products/shotmark -b sp
git push https://github.com/davideevangelisti/shotmark.git sp:main
git branch -D sp
```

## Build commands

```bash
npm install
npm test            # ship gate: typecheck + unit (Vitest) + build + E2E (Playwright)
npm run build:site  # landing + app -> site-dist/  (what Cloudflare serves)
npm run build:ext   # bump version + package extension -> extension/
npm run pack:zip    # -> shotmark-extension-v<version>.zip (store upload)
npm run hero        # regenerate landing hero (needs `npm run preview` running)
npm run gallery     # regenerate landing feature gallery (needs preview running)
```

---

# 1) Cloudflare (hosting the web app + landing)

**What it is:** a static site served by Cloudflare Workers (static assets).
Config is `wrangler.toml` (`[assets] directory = ./site-dist`). The Worker is
named `shotmark`. It is connected to the public GitHub repo, so **pushing the
subtree auto-deploys**. You can also deploy manually.

**Account:** Davide.evangelisti@gmail.com — Account ID `a4e10afc1398a55efd0de4ed7b462139`.

### Credentials
A Workers-scoped API token lives at **`~/.shotmark-cf.env`** (outside the repo,
chmod 600) as `CLOUDFLARE_API_TOKEN`. To recreate: Cloudflare dashboard →
My Profile → API Tokens → Create Token → "Edit Cloudflare Workers" template (or
Custom Token with `Account → Workers Scripts → Edit`), scope to this account.

### Deploy
```bash
# Option A — Git (hands-off): commit, then push the subtree (see above). CI builds
#   `npm run build:site` and deploys automatically.
# Option B — direct CLI (instant):
cd products/shotmark
npm run build:site
source ~/.shotmark-cf.env
npx wrangler deploy
```
Use ONE path per change (both are idempotent; doing both just deploys twice).

### Other Cloudflare CLI ops
```bash
source ~/.shotmark-cf.env
npx wrangler whoami                 # verify auth
npx wrangler deployments list --name shotmark
npx wrangler tail --name shotmark   # live logs
```

### Custom domain (not done yet — owner declined for now)
When a domain is bought: Cloudflare dashboard → the `shotmark` Worker → Settings
→ Domains & Routes → add the custom domain (Cloudflare handles DNS + HTTPS).
Then update `site/index.html` `<link rel="canonical">` + `og:url` + `og:image`
and the URLs in `STORE.md`, and redeploy. The token also needs
`Zone → DNS → Edit` + `Zone → Workers Routes → Edit` to do this via CLI.

### Gotchas
- Cloudflare serves **clean URLs**: `/privacy` works; `/privacy.html` 307-redirects
  to it. Use the clean form in links and the store listing.
- `cd products/shotmark` before npm commands (scripts are relative to it).

---

# 2) Chrome Web Store (+ Edge) publishing

**Status:** developer account **approved** (one-time $5 paid; updates are free
forever). Account: davide.evangelisti@gmail.com.

### First listing — ONE TIME, via the dashboard
The CLI can push code, but the **listing metadata + screenshots must be entered
in the dashboard once**, and the first upload mints the extension's ID.

1. `npm run build:ext && npm run pack:zip` → get `shotmark-extension-v<ver>.zip`.
2. https://chrome.google.com/webstore/devconsole → **Add new item** → upload the ZIP.
3. Fill the listing from **[STORE.md](STORE.md)** (name, summary, description,
   category=Productivity, permission justifications, privacy URL
   `https://shotmark.davide-evangelisti.workers.dev/privacy`, homepage URL).
4. Upload the screenshot: `npm run promo` → `promo/screenshot-1.png` (1280×800).
5. Privacy practices: **collects no user data; no remote code** (OCR engine is
   bundled). Submit for review.
6. **Copy the item's Extension ID** (shown in the dashboard) — needed for the CLI.

Edge Add-ons (free, no fee): same ZIP at https://partner.microsoft.com/dashboard/microsoftedge.

### Version updates — via CLI (`npm run publish:cws`)
Once the listing exists and you have the Extension ID, all future code updates
are one command. It builds, bumps the version, zips, uploads, and submits.

**One-time API setup** (needed for the CLI; do this once):
1. https://console.cloud.google.com → create/select a project.
2. APIs & Services → Library → enable **Chrome Web Store API**.
3. OAuth consent screen → External → add yourself as a test user.
4. Credentials → Create credentials → **OAuth client ID** → type **Desktop app**.
   Save the **Client ID** and **Client secret**.
5. Get a **refresh token** (one time), using the OAuth client from step 4 with
   scope `https://www.googleapis.com/auth/chromewebstore`. Reliable method:
   Google OAuth 2.0 Playground (https://developers.google.com/oauthplayground) →
   gear icon → "Use your own OAuth credentials" → paste client ID/secret →
   authorize that scope → exchange for tokens → copy the **refresh token**.
   (The `chrome-webstore-upload-cli` README also documents this flow; follow
   whichever its current version recommends.)

**Store the credentials** in `~/.shotmark-cws.env` (outside the repo, chmod 600):
```
EXTENSION_ID=<from the dashboard>
CLIENT_ID=<oauth client id>
CLIENT_SECRET=<oauth client secret>
REFRESH_TOKEN=<refresh token>
```

**Publish an update:**
```bash
cd products/shotmark
npm run publish:cws          # build + zip + upload + submit for review
npm run publish:cws -- --draft   # upload only; submit manually in the dashboard
```
Review usually takes hours to a couple of days; approved updates auto-push to users.

### Gotchas
- Every uploaded version must have a **higher version number** — handled
  automatically by `build:ext` (bumps the patch).
- Chrome removed in-store payments (2020). Any paid "Pro" unlock must happen on
  our own site (Gumroad/Paddle/ExtensionPay) — a Stage-6 decision, deferred.
- Keep credentials out of git. They live only in `~/.shotmark-cws.env`.
