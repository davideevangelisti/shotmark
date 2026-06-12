import { test, expect, Page } from "@playwright/test";

// A high-contrast text image — what OCR should reliably read.
async function makeTextImage(page: Page, text: string): Promise<string> {
  return page.evaluate((t) => {
    const c = document.createElement("canvas");
    c.width = 520; c.height = 160;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#000000";
    ctx.font = "bold 56px Arial, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(t, 30, 80);
    return c.toDataURL("image/png");
  }, text);
}

test("OCR reads clear text from the image", async ({ page }) => {
  test.setTimeout(90000); // first run downloads the Tesseract engine + lang data
  await page.goto("/");
  const url = await makeTextImage(page, "INVOICE 2026");
  await page.evaluate((u) => (window as any).__shotmark.load(u), url);
  await expect(page.locator("#canvas-wrap")).toBeVisible();

  await page.click("#ocr");
  // Wait until the result textarea is populated (status reaches Done).
  await expect(page.locator("#ocr-text")).not.toHaveValue("", { timeout: 80000 });
  const out = (await page.locator("#ocr-text").inputValue()).toUpperCase().replace(/\s+/g, " ");

  expect(out).toContain("INVOICE");
  expect(out).toContain("2026");
});
