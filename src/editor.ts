import {
  Canvas, Rect, Ellipse, Line, IText, PencilBrush, FabricImage,
  Polygon, Circle, Group, Textbox,
} from "fabric";
import { History } from "./history";
import { normalizeRect, hexToRgba, arrowHead, clamp, type Point } from "./util";
import { redactRegion, type RedactMode } from "./redact";
import { type BeautifySettings, DEFAULT_BEAUTIFY, resolveBackground } from "./beautify";
import { extractText, type OcrProgress } from "./ocr";

export type Tool =
  | "select" | "arrow" | "rect" | "ellipse" | "line" | "pen"
  | "highlighter" | "text" | "blur" | "pixelate" | "badge" | "crop";

export interface Style {
  color: string;
  strokeWidth: number;
  fontSize: number;
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });

export class Editor {
  readonly canvas: Canvas;
  private history = new History();
  private restoring = false;
  private tool: Tool = "select";
  private badgeCount = 0;
  private baseEl: HTMLImageElement | null = null;
  style: Style = { color: "#ff3b30", strokeWidth: 4, fontSize: 28 };
  beautify: BeautifySettings = { ...DEFAULT_BEAUTIFY };
  onChange: () => void = () => {};
  onToolChange: (t: Tool) => void = () => {};

  private start: Point | null = null;
  private last: Point | null = null;
  private draft: any = null;

  constructor(el: HTMLCanvasElement) {
    this.canvas = new Canvas(el, { backgroundColor: "#ffffff", preserveObjectStacking: true });
    this.canvas.on("mouse:down", (o) => this.onDown(o));
    this.canvas.on("mouse:move", (o) => this.onMove(o));
    this.canvas.on("mouse:up", () => this.onUp());
    this.canvas.on("object:modified", () => this.snapshot());
  }

  private pointer(opt: any): Point {
    if (opt?.scenePoint) return opt.scenePoint;
    const anyc = this.canvas as any;
    if (typeof anyc.getScenePoint === "function") return anyc.getScenePoint(opt.e);
    return anyc.getPointer(opt.e);
  }

  async loadImageFromUrl(url: string): Promise<void> {
    const el = await loadImage(url);
    this.baseEl = el;
    this.canvas.clear();
    this.canvas.setDimensions({ width: el.width, height: el.height });
    const bg = await FabricImage.fromURL(url);
    bg.set({ selectable: false, evented: false, hoverCursor: "default" });
    (bg as any).excludeFromExport = false;
    (this.canvas as any).backgroundImage = bg;
    this.canvas.renderAll();
    this.history = new History();
    this.snapshot();
  }

  hasImage(): boolean {
    return this.baseEl !== null;
  }

  setTool(t: Tool): void {
    this.tool = t;
    const drawing = t === "pen" || t === "highlighter";
    this.canvas.isDrawingMode = drawing;
    if (drawing) {
      const brush = new PencilBrush(this.canvas);
      brush.color = t === "highlighter" ? hexToRgba(this.style.color, 0.4) : this.style.color;
      brush.width = t === "highlighter" ? this.style.strokeWidth * 4 : this.style.strokeWidth;
      this.canvas.freeDrawingBrush = brush;
    }
    this.canvas.selection = t === "select";
    this.canvas.forEachObject((o) => (o.selectable = t === "select"));
    this.canvas.defaultCursor = t === "select" ? "default" : "crosshair";
    this.canvas.renderAll();
    this.onToolChange(t);
  }

  getTool(): Tool {
    return this.tool;
  }

  /** The Fabric wrapper element — used by the UI for the live backdrop preview. */
  get frameEl(): HTMLElement {
    return (this.canvas as any).wrapperEl as HTMLElement;
  }

  /** After placing an object: select it and return to the Select tool so the
   *  user can immediately drag, resize, or delete it. */
  private finishInsert(obj: any): void {
    this.setTool("select");
    obj.set({ selectable: true });
    this.canvas.setActiveObject(obj);
    this.canvas.requestRenderAll();
    this.snapshot();
  }

  /** Apply the current color/size to whatever is selected. */
  applyStyleToSelection(): void {
    const objs = this.canvas.getActiveObjects();
    if (!objs.length) return;
    for (const o of objs) {
      if (o.type === "i-text" || o.type === "textbox") {
        o.set({ fill: this.style.color, fontSize: this.style.fontSize });
      } else if (o.type !== "group" && o.type !== "image") {
        o.set({ stroke: this.style.color, strokeWidth: this.style.strokeWidth });
      }
    }
    this.canvas.requestRenderAll();
    this.snapshot();
  }

  private onDown(opt: any): void {
    if (this.tool === "select" || this.tool === "pen" || this.tool === "highlighter") return;
    const p = this.pointer(opt);
    this.start = p;
    this.last = p;

    if (this.tool === "text") {
      const t = new IText("Text", {
        left: p.x, top: p.y, fill: this.style.color, fontSize: this.style.fontSize,
        fontFamily: "-apple-system, Segoe UI, Roboto, sans-serif",
      });
      this.canvas.add(t);
      this.canvas.setActiveObject(t);
      t.enterEditing();
      t.selectAll();
      this.start = null;
      this.setTool("select"); // so it can be moved once typing is done
      this.snapshot();
      return;
    }
    if (this.tool === "badge") {
      this.badgeCount += 1;
      const r = Math.max(14, this.style.strokeWidth * 4);
      const circle = new Circle({ radius: r, fill: this.style.color, originX: "center", originY: "center" });
      const label = new Textbox(String(this.badgeCount), {
        fontSize: r, fill: "#fff", width: r * 2, textAlign: "center",
        originX: "center", originY: "center", top: 0,
      });
      const g = new Group([circle, label], { left: p.x, top: p.y, originX: "center", originY: "center" });
      this.canvas.add(g);
      this.start = null;
      this.finishInsert(g);
      return;
    }

    const common = { stroke: this.style.color, strokeWidth: this.style.strokeWidth, fill: "transparent", selectable: false };
    if (this.tool === "rect" || this.tool === "crop") {
      this.draft = new Rect({ left: p.x, top: p.y, width: 1, height: 1, ...common,
        fill: this.tool === "crop" ? "rgba(0,0,0,0.15)" : "transparent" });
      this.canvas.add(this.draft);
    } else if (this.tool === "ellipse") {
      this.draft = new Ellipse({ left: p.x, top: p.y, rx: 1, ry: 1, ...common });
      this.canvas.add(this.draft);
    } else if (this.tool === "line" || this.tool === "arrow") {
      this.draft = new Line([p.x, p.y, p.x, p.y], { stroke: this.style.color, strokeWidth: this.style.strokeWidth, selectable: false });
      this.canvas.add(this.draft);
    }
    // blur/pixelate: just record start; region computed on mouse up.
  }

  private onMove(opt: any): void {
    if (!this.start) return;
    const p = this.pointer(opt);
    this.last = p;
    if (!this.draft) return;
    if (this.tool === "rect" || this.tool === "crop") {
      const r = normalizeRect(this.start, p);
      this.draft.set(r);
    } else if (this.tool === "ellipse") {
      const r = normalizeRect(this.start, p);
      this.draft.set({ left: r.left, top: r.top, rx: r.width / 2, ry: r.height / 2 });
    } else if (this.tool === "line" || this.tool === "arrow") {
      this.draft.set({ x2: p.x, y2: p.y });
    }
    this.canvas.renderAll();
  }

  private async onUp(): Promise<void> {
    if (!this.start) return;
    const startPoint = this.start;
    const endPoint = this.last;
    this.start = null;

    if (this.tool === "crop" && this.draft) {
      const { left, top, width, height } = this.draft;
      this.canvas.remove(this.draft);
      this.draft = null;
      if (width > 5 && height > 5) await this.applyCrop(left, top, width, height);
      this.setTool("select");
      this.snapshot();
      return;
    }
    if (this.tool === "arrow" && this.draft) {
      const from = { x: this.draft.x1, y: this.draft.y1 };
      const to = { x: this.draft.x2, y: this.draft.y2 };
      this.canvas.remove(this.draft);
      this.draft = null;
      const g = this.addArrow(from, to);
      this.finishInsert(g);
      return;
    }
    if ((this.tool === "blur" || this.tool === "pixelate") && endPoint) {
      const img = await this.addRedaction(startPoint, endPoint, this.tool as RedactMode);
      if (img) this.finishInsert(img);
      else this.snapshot();
      return;
    }
    if (this.draft) {
      const obj = this.draft;
      this.draft = null;
      this.finishInsert(obj);
    }
  }

  private addArrow(from: Point, to: Point): Group {
    const headSize = Math.max(12, this.style.strokeWidth * 3);
    const [h1, h2] = arrowHead(from, to, headSize);
    const line = new Line([from.x, from.y, to.x, to.y], { stroke: this.style.color, strokeWidth: this.style.strokeWidth });
    const head = new Polygon([to, h1, h2], { fill: this.style.color });
    const g = new Group([line, head]);
    this.canvas.add(g);
    return g;
  }

  private async addRedaction(a: Point, b: Point, mode: RedactMode): Promise<FabricImage | null> {
    if (!this.baseEl) return null;
    const r = normalizeRect(a, b);
    if (r.width < 4 || r.height < 4) return null;
    const url = redactRegion(this.baseEl, r, mode, 12);
    const img = await FabricImage.fromURL(url);
    img.set({ left: r.left, top: r.top });
    this.canvas.add(img);
    this.canvas.renderAll();
    return img;
  }

  private async applyCrop(left: number, top: number, width: number, height: number): Promise<void> {
    const data = this.canvas.toDataURL({ format: "png", multiplier: 1, left, top, width, height } as any);
    await this.loadImageFromUrl(data);
  }

  // ---- editing ops ----
  deleteSelected(): void {
    const active = this.canvas.getActiveObjects();
    if (!active.length) return;
    active.forEach((o) => this.canvas.remove(o));
    this.canvas.discardActiveObject();
    this.snapshot();
  }

  private snapshot(): void {
    if (this.restoring) return;
    this.history.push(JSON.stringify(this.canvas.toJSON()));
    this.onChange();
  }

  async undo(): Promise<void> {
    const state = this.history.undo();
    if (state) await this.restore(state);
  }
  async redo(): Promise<void> {
    const state = this.history.redo();
    if (state) await this.restore(state);
  }
  canUndo(): boolean { return this.history.canUndo(); }
  canRedo(): boolean { return this.history.canRedo(); }

  private async restore(state: string): Promise<void> {
    this.restoring = true;
    await this.canvas.loadFromJSON(JSON.parse(state));
    this.canvas.renderAll();
    this.restoring = false;
    this.onChange();
  }

  objectCount(): number {
    return this.canvas.getObjects().length;
  }

  /** OCR the original (un-annotated) image. */
  async ocr(onProgress?: (p: OcrProgress) => void): Promise<string> {
    if (!this.baseEl) return "";
    return extractText(this.baseEl, onProgress);
  }

  // ---- export ----
  async export(format: "png" | "jpg", scale: 1 | 2 | 3): Promise<string> {
    const inner = this.canvas.toDataURL({ format: "png", multiplier: scale } as any);
    if (!this.beautify.enabled) {
      if (format === "png") return inner;
      const img = await loadImage(inner);
      return this.flatten(img, "image/jpeg");
    }
    const img = await loadImage(inner);
    return this.composeBeautified(img, format === "jpg" ? "image/jpeg" : "image/png", scale);
  }

  private flatten(img: HTMLImageElement, mime: string): string {
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0);
    return c.toDataURL(mime, 0.92);
  }

  private composeBeautified(img: HTMLImageElement, mime: string, scale: number): string {
    const pad = this.beautify.padding * scale;
    const radius = this.beautify.radius * scale;
    const shadow = this.beautify.shadow * scale;
    const W = img.width + pad * 2;
    const H = img.height + pad * 2;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d")!;

    const bg = resolveBackground(this.beautify.background);
    if (bg.type === "gradient") {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, bg.stops[0]);
      g.addColorStop(1, bg.stops[1]);
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = bg.color;
    }
    ctx.fillRect(0, 0, W, H);

    if (shadow > 0) {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = shadow;
      ctx.shadowOffsetY = shadow / 3;
    }
    this.roundedPath(ctx, pad, pad, img.width, img.height, clamp(radius, 0, Math.min(img.width, img.height) / 2));
    ctx.fillStyle = "#fff";
    ctx.fill();
    if (shadow > 0) ctx.restore();

    ctx.save();
    this.roundedPath(ctx, pad, pad, img.width, img.height, clamp(radius, 0, Math.min(img.width, img.height) / 2));
    ctx.clip();
    ctx.drawImage(img, pad, pad);
    ctx.restore();

    return c.toDataURL(mime, 0.92);
  }

  private roundedPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
