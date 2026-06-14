// Package the built extension into a ZIP for Chrome Web Store / Edge Add-ons
// upload. Run after `npm run build:ext`. Output: shotmark-extension-v<ver>.zip
import { execSync } from "node:child_process";
import { rmSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const version = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).version;
const zipName = `shotmark-extension-v${version}.zip`;
const zipPath = resolve(root, zipName);

if (!existsSync(resolve(root, "extension/app/index.html"))) {
  throw new Error("Build the extension first: npm run build:ext");
}
if (existsSync(zipPath)) rmSync(zipPath);

// Zip the *contents* of extension/ so manifest.json sits at the archive root.
execSync(`cd "${resolve(root, "extension")}" && zip -r -q "${zipPath}" . -x "README.md"`, {
  stdio: "inherit",
  shell: "/bin/bash",
});

console.log(`✓ ${zipName} ready to upload (manifest at root).`);
