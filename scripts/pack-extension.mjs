// Build the app and copy it into extension/app/ so the whole `extension/`
// folder can be loaded unpacked in Chrome/Edge.
import { execSync } from "node:child_process";
import { rmSync, cpSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

execSync("npm run build", { cwd: root, stdio: "inherit" });

const appDir = resolve(root, "extension/app");
if (existsSync(appDir)) rmSync(appDir, { recursive: true, force: true });
cpSync(resolve(root, "dist"), appDir, { recursive: true });

console.log("\n✓ Extension packed. Load this folder unpacked in chrome://extensions:");
console.log("  " + resolve(root, "extension"));
