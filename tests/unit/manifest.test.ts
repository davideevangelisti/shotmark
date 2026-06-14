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
  it("uses a popup for the capture options", () => {
    expect(manifest.action.default_popup).toBe("popup.html");
  });
  it("requests the capture/save/copy permissions but no broad host access", () => {
    for (const p of ["activeTab", "storage", "scripting", "downloads", "clipboardWrite"]) {
      expect(manifest.permissions).toContain(p);
    }
    expect(manifest.permissions).not.toContain("<all_urls>");
    expect(manifest.permissions).not.toContain("tabs");
  });
  it("declares all icon sizes", () => {
    for (const s of ["16", "48", "128"]) expect(manifest.icons[s]).toBeTruthy();
  });
});
