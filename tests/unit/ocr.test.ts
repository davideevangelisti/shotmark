import { describe, it, expect } from "vitest";
import { cleanText } from "../../src/ocr";

describe("cleanText", () => {
  it("trims trailing spaces before newlines", () => {
    expect(cleanText("hello   \nworld")).toBe("hello\nworld");
  });
  it("collapses 3+ blank lines to one blank line", () => {
    expect(cleanText("a\n\n\n\nb")).toBe("a\n\nb");
  });
  it("collapses runs of inline whitespace", () => {
    expect(cleanText("foo     bar")).toBe("foo bar");
  });
  it("trims the ends", () => {
    expect(cleanText("\n\n  text  \n\n")).toBe("text");
  });
});
