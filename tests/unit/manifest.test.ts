import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const manifest = JSON.parse(
  readFileSync(resolve(process.cwd(), "extension/manifest.json"), "utf8"),
);

describe("extension manifest", () => {
  it("is Manifest V3", () => {
    expect(manifest.manifest_version).toBe(3);
  });
  it("registers a background service worker", () => {
    expect(manifest.background.service_worker).toBe("background.js");
  });
  it("requests only minimal permissions", () => {
    expect(manifest.permissions).toContain("activeTab");
    expect(manifest.permissions).toContain("storage");
    expect(manifest.permissions).not.toContain("<all_urls>");
    expect(manifest.permissions).not.toContain("tabs");
  });
  it("declares all icon sizes", () => {
    for (const s of ["16", "48", "128"]) expect(manifest.icons[s]).toBeTruthy();
  });
});
