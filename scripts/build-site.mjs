// Assemble the public site: landing page at the root, the Shotmark app at /app.
// Output: site-dist/  (what Cloudflare Pages / GitHub Pages serves)
import { execSync } from "node:child_process";
import { rmSync, cpSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// 1. Build the app (vite -> dist)
execSync("npm run build", { cwd: root, stdio: "inherit" });

// 2. Fresh output dir
const out = resolve(root, "site-dist");
if (existsSync(out)) rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// 3. Landing page + assets at the root
cpSync(resolve(root, "site"), out, { recursive: true });

// 4. The app under /app
cpSync(resolve(root, "dist"), resolve(out, "app"), { recursive: true });

console.log("\n✓ Site assembled → site-dist/  (landing at /, app at /app/)");
console.log("  Deploy: see DEPLOY.md");
