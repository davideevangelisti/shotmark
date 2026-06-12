// Undo/redo as a pure snapshot stack. The editor pushes serialized canvas
// states (JSON strings); this class knows nothing about Fabric. Unit-testable.

export class History {
  private stack: string[] = [];
  private index = -1;
  private readonly limit: number;

  constructor(limit = 50) {
    this.limit = limit;
  }

  /** Record a new state, discarding any redo branch. */
  push(state: string): void {
    // Drop everything after the current position (we branched).
    this.stack = this.stack.slice(0, this.index + 1);
    this.stack.push(state);
    if (this.stack.length > this.limit) {
      this.stack.shift();
    } else {
      this.index++;
    }
    // After a shift the index stays at the (now last) element.
    this.index = this.stack.length - 1;
  }

  canUndo(): boolean {
    return this.index > 0;
  }

  canRedo(): boolean {
    return this.index < this.stack.length - 1;
  }

  undo(): string | null {
    if (!this.canUndo()) return null;
    this.index--;
    return this.stack[this.index];
  }

  redo(): string | null {
    if (!this.canRedo()) return null;
    this.index++;
    return this.stack[this.index];
  }

  /** Current state without moving. */
  current(): string | null {
    return this.index >= 0 ? this.stack[this.index] : null;
  }

  size(): number {
    return this.stack.length;
  }
}
