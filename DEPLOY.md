# Deploying Shotmark

Deployment and publishing are documented in the operations runbook:

**→ [OPERATIONS.md](OPERATIONS.md)**

- Section 1 — Cloudflare (hosting the web app + landing): live URL, `wrangler.toml`,
  Git auto-deploy and direct `wrangler deploy`, the API token location, custom domain.
- Section 2 — Chrome Web Store / Edge: first listing (dashboard), then CLI updates
  via `npm run publish:cws`, with the one-time Google API setup.

Listing copy and permission justifications live in [STORE.md](STORE.md).
