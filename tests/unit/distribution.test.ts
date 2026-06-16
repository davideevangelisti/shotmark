import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd(), "../..");
const siteIndex = readFileSync(resolve(process.cwd(), "site/index.html"), "utf8");
const launchPlan = readFileSync(resolve(repoRoot, "docs/LAUNCH.md"), "utf8");

const storeUrl =
  "https://chromewebstore.google.com/detail/epadokhpohhghklmojibgbjicmlbnhof";

describe("distribution artifacts", () => {
  it("reflects the live Chrome Web Store listing on the landing page", () => {
    expect(siteIndex).toContain("Now live on the Chrome Web Store");
    expect(siteIndex).toContain(storeUrl);
    expect(siteIndex).toContain("Add to Chrome");
    expect(siteIndex).toContain("Open the web app");
    expect(siteIndex).not.toContain("submitted and in review");
    // Old pre-2020 store host should never reappear.
    expect(siteIndex).not.toContain("chrome.google.com/webstore");
  });

  it("points landing-page feedback to GitHub Issues", () => {
    expect(siteIndex).toContain("https://github.com/davideevangelisti/shotmark/issues");
    expect(siteIndex).toContain("Feedback &amp; bugs");
  });

  it("keeps launch drafts pointed at the live Pages URL", () => {
    expect(launchPlan).toContain("Shotmark's web app is live at https://shotmark.pages.dev/");
    expect(launchPlan.match(/https:\/\/shotmark\.pages\.dev\//g)?.length).toBeGreaterThanOrEqual(6);
    expect(launchPlan).not.toContain("localhost");
  });

  it("links the live store listing from the launch drafts and unblocks Product Hunt", () => {
    expect(launchPlan).toContain(storeUrl);
    expect(launchPlan).toContain("Product Hunt | Ready (unblocked)");
    expect(launchPlan).not.toContain("Launch after Chrome listing is approved");
  });
});
