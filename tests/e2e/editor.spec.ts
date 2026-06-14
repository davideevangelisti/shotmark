import { test, expect, Page } from "@playwright/test";

// A deterministic 200x120 test image (two colored halves) as a data URL.
async function makeFixture(page: Page): Promise<string> {
  return page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 200; c.height = 120;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#3366cc"; ctx.fillRect(0, 0, 100, 120);
    ctx.fillStyle = "#cc6633"; ctx.fillRect(100, 0, 100, 120);
    return c.toDataURL("image/png");
  });
}

async function loadFixture(page: Page) {
  const url = await makeFixture(page);
  await page.evaluate((u) => (window as any).__shotmark.load(u), url);
  await expect(page.locator("#canvas-wrap")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("loads an image at its native size", async ({ page }) => {
  await loadFixture(page);
  const dims = await page.evaluate(() => {
    const e = (window as any).__shotmark.editor;
    return { w: e.canvas.getWidth(), h: e.canvas.getHeight(), n: e.objectCount() };
  });
  expect(dims).toEqual({ w: 200, h: 120, n: 0 });
});

test("drawing a rectangle with the mouse adds one object", async ({ page }) => {
  await loadFixture(page);
  await page.click('.tool[data-tool="rect"]');
  const box = (await page.locator("#canvas").boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 90, box.y + 80, { steps: 5 });
  await page.mouse.up();
  const n = await page.evaluate(() => (window as any).__shotmark.editor.objectCount());
  expect(n).toBe(1);
});

test("undo and redo move the object count", async ({ page }) => {
  await loadFixture(page);
  await page.click('.tool[data-tool="rect"]');
  const box = (await page.locator("#canvas").boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 90, box.y + 80, { steps: 5 });
  await page.mouse.up();

  expect(await page.evaluate(() => (window as any).__shotmark.editor.objectCount())).toBe(1);
  await page.evaluate(() => (window as any).__shotmark.editor.undo());
  expect(await page.evaluate(() => (window as any).__shotmark.editor.objectCount())).toBe(0);
  await page.evaluate(() => (window as any).__shotmark.editor.redo());
  expect(await page.evaluate(() => (window as any).__shotmark.editor.objectCount())).toBe(1);
});

test("redaction (blur) adds an overlay object", async ({ page }) => {
  await loadFixture(page);
  await page.click('.tool[data-tool="blur"]');
  const box = (await page.locator("#canvas").boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 70, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(200); // redaction is async (image load)
  const n = await page.evaluate(() => (window as any).__shotmark.editor.objectCount());
  expect(n).toBe(1);
});

test("export PNG honors the scale multiplier", async ({ page }) => {
  await loadFixture(page);
  const size = await page.evaluate(async () => {
    const data = await (window as any).__shotmark.editor.export("png", 2);
    const img = new Image();
    await new Promise((r) => { img.onload = r; img.src = data; });
    return { w: img.width, h: img.height, isPng: data.startsWith("data:image/png"), bytes: data.length };
  });
  expect(size.isPng).toBe(true);
  expect(size.w).toBe(400);
  expect(size.h).toBe(240);
  expect(size.bytes).toBeGreaterThan(1000);
});

test("backdrop is applied live and is included in export", async ({ page }) => {
  await loadFixture(page);
  const res = await page.evaluate(async () => {
    const e = (window as any).__shotmark.editor;
    e.beautify.enabled = true;
    e.beautify.padding = 64;
    e.beautify.background = "ocean";
    e.applyBackdrop();
    const liveWidth = e.canvas.getWidth(); // applied to the canvas, not just export
    const data = await e.export("png", 1);
    const img = new Image();
    await new Promise((r) => { img.onload = r; img.src = data; });
    return { liveWidth, exportWidth: img.width };
  });
  expect(res.liveWidth).toBe(200 + 64 * 2);
  expect(res.exportWidth).toBe(200 + 64 * 2);
});

test("spotlight adds a dimming overlay object", async ({ page }) => {
  await loadFixture(page);
  await page.click('.tool[data-tool="spotlight"]');
  const box = (await page.locator("#canvas").boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + 90, { steps: 5 });
  await page.mouse.up();
  const n = await page.evaluate(() => (window as any).__shotmark.editor.objectCount());
  expect(n).toBe(1);
});

test("text style can be changed on a selected text object", async ({ page }) => {
  await loadFixture(page);
  const res = await page.evaluate(() => {
    const e = (window as any).__shotmark.editor;
    e.setTool("text");
    // simulate a text placement by adding via the same path the tool uses
    e.canvas.fire("mouse:down", { e: new MouseEvent("mousedown"), scenePoint: { x: 40, y: 40 } });
    e.setTextStyle({ fontFamily: "Georgia, serif", fontSize: 44, fontWeight: "bold" });
    const o: any = e.canvas.getActiveObject();
    return { font: o?.fontFamily, size: o?.fontSize, weight: o?.fontWeight, isText: e.isTextSelected() };
  });
  expect(res.isText).toBe(true);
  expect(res.font).toBe("Georgia, serif");
  expect(res.size).toBe(44);
  expect(res.weight).toBe("bold");
});
