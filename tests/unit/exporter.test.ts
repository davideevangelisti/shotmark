import { describe, it, expect } from "vitest";
import { mimeFor, resolveScale, dataUrlToBlob } from "../../src/exporter";

describe("mimeFor", () => {
  it("maps formats", () => {
    expect(mimeFor("png")).toBe("image/png");
    expect(mimeFor("jpg")).toBe("image/jpeg");
  });
});

describe("resolveScale", () => {
  it("passes valid scales", () => {
    expect(resolveScale(3)).toBe(3);
  });
  it("clamps invalid scales to 1", () => {
    expect(resolveScale(7)).toBe(1);
    expect(resolveScale(0)).toBe(1);
  });
});

describe("dataUrlToBlob", () => {
  it("decodes a tiny png data url to a blob of the right type", () => {
    // 1x1 transparent PNG
    const url =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const blob = dataUrlToBlob(url);
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBeGreaterThan(0);
  });
});
