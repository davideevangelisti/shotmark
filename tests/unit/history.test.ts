import { describe, it, expect } from "vitest";
import { History } from "../../src/history";

describe("History", () => {
  it("starts empty with nothing to undo/redo", () => {
    const h = new History();
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
  });

  it("undo/redo walks the stack", () => {
    const h = new History();
    h.push("a"); h.push("b"); h.push("c");
    expect(h.current()).toBe("c");
    expect(h.undo()).toBe("b");
    expect(h.undo()).toBe("a");
    expect(h.canUndo()).toBe(false);
    expect(h.redo()).toBe("b");
    expect(h.redo()).toBe("c");
    expect(h.canRedo()).toBe(false);
  });

  it("pushing after an undo discards the redo branch", () => {
    const h = new History();
    h.push("a"); h.push("b"); h.push("c");
    h.undo(); // back to b
    h.push("d");
    expect(h.current()).toBe("d");
    expect(h.canRedo()).toBe(false);
    expect(h.undo()).toBe("b");
  });

  it("respects the size limit by dropping the oldest", () => {
    const h = new History(3);
    h.push("a"); h.push("b"); h.push("c"); h.push("d");
    expect(h.size()).toBe(3);
    // oldest "a" dropped; walking back reaches "b" at most
    h.undo(); h.undo();
    expect(h.canUndo()).toBe(false);
    expect(h.current()).toBe("b");
  });
});
