# Shotmark — Operations runbook

The single reference for **deploying** (Cloudflare) and **publishing**
(Chrome Web Store / Edge). Written so anyone — the owner or any coding agent —
can do it cold. No secrets are stored in this repo; this explains where they
live and how to recreate them.

- Live site: **https://shotmark.pages.dev/** (`/` landing, `/app/` tool, `/privacy` policy)
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

**What it is:** a static site on **Cloudflare Pages** (project `shotmark`),
Git-connected to the public GitHub repo. **Pushing the subtree auto-builds**
(`npm run build:site`, output dir `site-dist`) and deploys to
**`shotmark.pages.dev`**. (We started on a Worker but migrated to Pages for the
clean, name-free URL — the workers.dev subdomain is permanent and can't be
renamed. The old Worker was deleted.)

**Account:** Davide.evangelisti@gmail.com — Account ID `a4e10afc1398a55efd0de4ed7b462139`.

### Deploy
Primary path is **just push** — Cloudflare Pages rebuilds automatically:
```bash
# commit in autoforge, then publish the subtree (see "Repo layout reminder")
```
Manual CLI deploy is possible but needs a **Pages-scoped** token:
```bash
cd products/shotmark && npm run build:site
source ~/.shotmark-cf.env   # must be an Account → Cloudflare Pages → Edit token
npx wrangler pages deploy site-dist --project-name=shotmark --branch=main
```

### Credentials
`~/.shotmark-cf.env` (outside the repo, chmod 600) holds `CLOUDFLARE_API_TOKEN`.
NOTE: the current token is **Workers-scoped** — fine for account ops, but **not**
for Pages CLI deploys. Routine deploys don't need it (Git auto-deploys). For
manual Pages deploys or to manage the project via CLI, create a token with
`Account → Cloudflare Pages → Edit` and replace the file.

### Other Cloudflare CLI ops
```bash
source ~/.shotmark-cf.env
npx wrangler whoami                                       # verify auth/account
npx wrangler pages deployment list --project-name=shotmark   # (needs Pages token)
```

### Custom domain (not done yet — owner declined for now)
When a domain is bought: Cloudflare dashboard → **Workers & Pages → shotmark
(Pages) → Custom domains → Set up a custom domain** (Cloudflare handles DNS +
HTTPS). Then update `site/index.html` `<link rel="canonical">` + `og:url` +
`og:image` and the URLs in `STORE.md`, and push.

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
   `https://shotmark.pages.dev/privacy`, homepage URL).
4. Upload the screenshot `promo/store-screenshot-1280x800.png` (regenerate with
   `npm run promo`) and the store icon `promo/store-icon-128.png`.
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
3. OAuth consent screen → User type **External** → fill app name + your email.
   **Publish the app to "In production"** (not just Testing). Reason: in Testing
   mode refresh tokens expire after **7 days**; in production they're long-lived.
   You'll later see an "unverified app" warning when authorizing — that's fine
   for personal use (Advanced → continue).
4. Credentials → Create credentials → **OAuth client ID** → type **Web
   application** (NOT Desktop — the token method below needs a registered redirect
   URI). Under **Authorized redirect URIs** add exactly:
   `https://developers.google.com/oauthplayground`. Save the **Client ID** and
   **Client secret**.
5. Get a **refresh token** (one time) via the OAuth 2.0 Playground:
   - https://developers.google.com/oauthplayground → gear (top-right) →
     check **"Use your own OAuth credentials"** → paste Client ID + Secret.
   - Left panel "Input your own scopes" → enter
     `https://www.googleapis.com/auth/chromewebstore` → **Authorize APIs** →
     sign in with the **same Google account** that owns the dev account → allow.
   - Step 2 → **Exchange authorization code for tokens** → copy the **Refresh token**.

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
