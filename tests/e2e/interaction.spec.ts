import { test, expect, Page } from "@playwright/test";

async function loadFixture(page: Page) {
  const url = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 200; c.height = 120;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#3366cc"; ctx.fillRect(0, 0, 200, 120);
    return c.toDataURL("image/png");
  });
  await page.evaluate((u) => (window as any).__shotmark.load(u), url);
  await expect(page.locator("#canvas-wrap")).toBeVisible();
}

async function drawBox(page: Page) {
  await page.click('.tool[data-tool="rect"]');
  const box = (await page.locator("#canvas").boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 90, box.y + 80, { steps: 5 });
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => { await page.goto("/"); await loadFixture(page); });

test("after drawing, the tool returns to Select with the new object selected", async ({ page }) => {
  await drawBox(page);
  const state = await page.evaluate(() => {
    const e = (window as any).__shotmark.editor;
    return { tool: e.getTool(), hasActive: !!e.canvas.getActiveObject(), count: e.objectCount() };
  });
  expect(state.tool).toBe("select");
  expect(state.hasActive).toBe(true);
  expect(state.count).toBe(1);
});

test("the Select button is highlighted after an auto-return", async ({ page }) => {
  await drawBox(page);
  await expect(page.locator('.tool[data-tool="select"]')).toHaveClass(/active/);
});

test("a selected object can be deleted with the Delete button", async ({ page }) => {
  await drawBox(page);
  expect(await page.evaluate(() => (window as any).__shotmark.editor.objectCount())).toBe(1);
  await page.click("#delete");
  expect(await page.evaluate(() => (window as any).__shotmark.editor.objectCount())).toBe(0);
});

test("a placed object can be moved by dragging it in Select mode", async ({ page }) => {
  await drawBox(page);
  const before = await page.evaluate(() => {
    const o = (window as any).__shotmark.editor.canvas.getActiveObject();
    return { left: o.left, top: o.top };
  });
  const box = (await page.locator("#canvas").boundingBox())!;
  // grab inside the box (~55,50) and drag right/down
  await page.mouse.move(box.x + 55, box.y + 50);
  await page.mouse.down();
  await page.mouse.move(box.x + 105, box.y + 90, { steps: 6 });
  await page.mouse.up();
  const after = await page.evaluate(() => {
    const o = (window as any).__shotmark.editor.canvas.getObjects()[0];
    return { left: o.left, top: o.top };
  });
  expect(after.left).toBeGreaterThan(before.left);
  expect(after.top).toBeGreaterThan(before.top);
});
