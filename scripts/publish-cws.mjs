// Publish the extension to the Chrome Web Store via the API (for version updates
// after the first listing exists). Credentials live OUTSIDE the repo in
// ~/.shotmark-cws.env (see OPERATIONS.md). Never commit them.
//
//   npm run publish:cws            # build + zip + upload + submit for review
//   npm run publish:cws -- --draft # upload only, don't submit (review manually)
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Load credentials from ~/.shotmark-cws.env (KEY=VALUE per line).
const envPath = resolve(homedir(), ".shotmark-cws.env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*(\w+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const needed = ["EXTENSION_ID", "CLIENT_ID", "CLIENT_SECRET", "REFRESH_TOKEN"];
const missing = needed.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing credentials: ${missing.join(", ")}`);
  console.error(`Put them in ${envPath} — see OPERATIONS.md "Chrome Web Store".`);
  process.exit(1);
}

// Build + package the latest extension.
execSync("npm run build:ext", { cwd: root, stdio: "inherit" });
execSync("npm run pack:zip", { cwd: root, stdio: "inherit" });

const zip = readdirSync(root).filter((f) => /^shotmark-extension-v.*\.zip$/.test(f))
  .sort().pop();
if (!zip) throw new Error("No extension zip found");

const draft = process.argv.includes("--draft");
const cmd = `npx chrome-webstore-upload upload --source "${zip}"` + (draft ? "" : " --auto-publish");
console.log(`\n→ ${cmd}`);
execSync(cmd, { cwd: root, stdio: "inherit", env: process.env });
console.log(draft ? "\n✓ Uploaded as draft (submit in the dashboard)." : "\n✓ Uploaded and submitted for review.");
