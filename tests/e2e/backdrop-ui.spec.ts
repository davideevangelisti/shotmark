import { test, expect, Page } from "@playwright/test";

async function loadFixture(page: Page) {
  const url = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 200; c.height = 120;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#3366cc"; ctx.fillRect(0, 0, 200, 120); // blue screenshot
    return c.toDataURL("image/png");
  });
  await page.evaluate((u) => (window as any).__shotmark.load(u), url);
  await expect(page.locator("#canvas-wrap")).toBeVisible();
}

// Sample a near-corner pixel of the live canvas (not export) to confirm the
// backdrop actually rendered on screen.
async function cornerPixel(page: Page) {
  return page.evaluate(() => {
    const e = (window as any).__shotmark.editor;
    const data = e.canvas.toDataURL({ format: "png", multiplier: 1 });
    return new Promise<{ r: number; g: number; b: number }>((res) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.width; c.height = img.height;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        const [r, g, b] = ctx.getImageData(2, 2, 1, 1).data;
        res({ r, g, b });
      };
      img.src = data;
    });
  });
}

test("toggling Backdrop in the UI grows the canvas and paints the background", async ({ page }) => {
  await page.goto("/");
  await loadFixture(page);

  // before: corner is the blue screenshot
  const before = await cornerPixel(page);
  expect(before.b).toBeGreaterThan(before.r); // bluish

  await page.locator("#beautify-panel summary").click(); // open the panel
  await page.locator("#b-enabled").check();              // real click on the checkbox

  const width = await page.evaluate(() => (window as any).__shotmark.editor.canvas.getWidth());
  expect(width).toBe(200 + 64 * 2); // padding applied live

  const after = await cornerPixel(page);
  // sunset gradient top-left ≈ #ff7e5f → red dominant, not blue
  expect(after.r).toBeGreaterThan(after.b);
});
