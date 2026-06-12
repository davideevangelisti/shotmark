import { describe, it, expect } from "vitest";
import {
  normalizeRect, clamp, exportFilename, hexToRgba, isValidScale, arrowHead, distance,
} from "../../src/util";

describe("normalizeRect", () => {
  it("handles a bottom-right drag", () => {
    expect(normalizeRect({ x: 10, y: 10 }, { x: 30, y: 50 }))
      .toEqual({ left: 10, top: 10, width: 20, height: 40 });
  });
  it("handles a top-left (reversed) drag", () => {
    expect(normalizeRect({ x: 30, y: 50 }, { x: 10, y: 10 }))
      .toEqual({ left: 10, top: 10, width: 20, height: 40 });
  });
});

describe("clamp", () => {
  it("bounds below and above", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
    expect(clamp(5, 0, 10)).toBe(5);
  });
});

describe("exportFilename", () => {
  it("produces a stable, safe name", () => {
    const d = new Date(2026, 5, 12, 9, 7, 3); // months are 0-based
    expect(exportFilename("png", d)).toBe("shotmark-20260612-090703.png");
  });
  it("sanitizes a junk extension", () => {
    expect(exportFilename("../jpg!", new Date(2026, 0, 1, 0, 0, 0)))
      .toBe("shotmark-20260101-000000.jpg");
  });
});

describe("hexToRgba", () => {
  it("expands and applies alpha", () => {
    expect(hexToRgba("#ff0000", 0.4)).toBe("rgba(255,0,0,0.4)");
    expect(hexToRgba("#f00", 1)).toBe("rgba(255,0,0,1)");
  });
  it("falls back safely on bad input", () => {
    expect(hexToRgba("nope", 2)).toBe("rgba(0,0,0,1)");
  });
});

describe("isValidScale", () => {
  it("accepts only 1,2,3", () => {
    expect(isValidScale(2)).toBe(true);
    expect(isValidScale(4)).toBe(false);
  });
});

describe("arrowHead", () => {
  it("returns two points near the tip", () => {
    const [a, b] = arrowHead({ x: 0, y: 0 }, { x: 100, y: 0 }, 12);
    // both wings sit behind the tip on the x-axis
    expect(a.x).toBeLessThan(100);
    expect(b.x).toBeLessThan(100);
    expect(distance(a, { x: 100, y: 0 })).toBeGreaterThan(0);
  });
});
