import { test, expect, Page } from "@playwright/test";

async function loadBig(page: Page) {
  // 2000x1400 — larger than the viewport, so it must be fit-zoomed to show fully
  const url = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 2000; c.height = 1400;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#444"; ctx.fillRect(0, 0, c.width, c.height);
    return c.toDataURL("image/png");
  });
  await page.evaluate((u) => (window as any).__shotmark.load(u), url);
  await expect(page.locator("#canvas-wrap")).toBeVisible();
}
const zoom = (page: Page) => page.evaluate(() => (window as any).__shotmark.editor.getZoom());

test.beforeEach(async ({ page }) => { await page.goto("/"); await loadBig(page); });

test("a large image is fit-zoomed below 100% on load", async ({ page }) => {
  expect(await zoom(page)).toBeLessThan(1);
});

test("zoom in / out buttons change the zoom level", async ({ page }) => {
  await page.click("#zoom-100");
  expect(await zoom(page)).toBeCloseTo(1, 5);
  await page.click("#zoom-in");
  expect(await zoom(page)).toBeGreaterThan(1);
  await page.click("#zoom-out");
  await page.click("#zoom-out");
  expect(await zoom(page)).toBeLessThan(1);
});

test("Fit returns the whole image to a visible zoom", async ({ page }) => {
  await page.click("#zoom-100");
  await page.click("#zoom-fit");
  expect(await zoom(page)).toBeLessThan(1);
});

test("export is independent of the current zoom level", async ({ page }) => {
  await page.click("#zoom-in"); // zoom to ~1.2x of fit
  const w = await page.evaluate(async () => {
    const data = await (window as any).__shotmark.editor.export("png", 1);
    const img = new Image();
    await new Promise((r) => { img.onload = r; img.src = data; });
    return img.width;
  });
  expect(w).toBe(2000); // always exports at logical 1:1 regardless of zoom
});
