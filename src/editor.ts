import {
  Canvas, Rect, Ellipse, Line, IText, PencilBrush, FabricImage,
  Polygon, Circle, Group, Textbox, Gradient, Shadow,
} from "fabric";
import { History } from "./history";
import { normalizeRect, hexToRgba, arrowHead, clamp, type Point } from "./util";
import { redactRegion, type RedactMode } from "./redact";
import { type BeautifySettings, DEFAULT_BEAUTIFY, resolveBackground } from "./beautify";
import { extractText, type OcrProgress } from "./ocr";

export type Tool =
  | "select" | "arrow" | "rect" | "ellipse" | "line" | "pen"
  | "highlighter" | "text" | "blur" | "pixelate" | "badge" | "crop" | "spotlight";

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
  private bgImg: FabricImage | null = null;
  private offset = 0;
  private zoom = 1;
  private logicalW = 0;
  private logicalH = 0;
  style: Style = { color: "#ff3b30", strokeWidth: 4, fontSize: 28 };
  beautify: BeautifySettings = { ...DEFAULT_BEAUTIFY };
  onChange: () => void = () => {};
  onToolChange: (t: Tool) => void = () => {};
  onSelection: (obj: any | null) => void = () => {};
  onZoom: (z: number) => void = () => {};

  private start: Point | null = null;
  private last: Point | null = null;
  private draft: any = null;

  constructor(el: HTMLCanvasElement) {
    this.canvas = new Canvas(el, { backgroundColor: "#ffffff", preserveObjectStacking: true });
    this.canvas.on("mouse:down", (o) => this.onDown(o));
    this.canvas.on("mouse:move", (o) => this.onMove(o));
    this.canvas.on("mouse:up", () => this.onUp());
    this.canvas.on("object:modified", () => this.snapshot());
    const emitSel = () => this.onSelection(this.canvas.getActiveObject() ?? null);
    this.canvas.on("selection:created", emitSel);
    this.canvas.on("selection:updated", emitSel);
    this.canvas.on("selection:cleared", () => this.onSelection(null));
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
    this.offset = 0;
    this.zoom = 1;
    const bg = await FabricImage.fromURL(url);
    bg.set({ selectable: false, evented: false, hoverCursor: "default" });
    this.bgImg = bg;
    (this.canvas as any).backgroundImage = bg;
    this.applyBackdrop();
    this.history = new History();
    this.snapshot();
  }

  hasImage(): boolean {
    return this.baseEl !== null;
  }

  /** Render the backdrop as real canvas content (size, background fill, the
   *  screenshot's position, rounded corners and shadow) so the editor is
   *  exactly what gets exported. Shifts existing annotations to stay aligned
   *  when the padding changes. */
  applyBackdrop(): void {
    const el = this.baseEl;
    const img = this.bgImg;
    if (!el || !img) return;
    const b = this.beautify;
    const newOffset = b.enabled ? b.padding : 0;
    const delta = newOffset - this.offset;
    if (delta !== 0) {
      for (const o of this.canvas.getObjects()) {
        o.set({ left: (o.left ?? 0) + delta, top: (o.top ?? 0) + delta });
        o.setCoords();
      }
    }
    this.offset = newOffset;

    const W = el.width + newOffset * 2;
    const H = el.height + newOffset * 2;
    this.logicalW = W;
    this.logicalH = H;

    if (b.enabled) {
      const bg = resolveBackground(b.background);
      if (bg.type === "gradient") {
        this.canvas.backgroundColor = new Gradient({
          type: "linear",
          coords: { x1: 0, y1: 0, x2: W, y2: H },
          colorStops: [
            { offset: 0, color: bg.stops[0] },
            { offset: 1, color: bg.stops[1] },
          ],
        }) as any;
      } else {
        this.canvas.backgroundColor = bg.color;
      }
    } else {
      this.canvas.backgroundColor = "#ffffff";
    }

    img.set({ left: newOffset, top: newOffset });
    img.shadow = b.enabled && b.shadow > 0
      ? new Shadow({ color: "rgba(0,0,0,0.35)", blur: b.shadow, offsetX: 0, offsetY: Math.round(b.shadow / 3) })
      : null;
    const radius = b.enabled ? clamp(b.radius, 0, Math.min(el.width, el.height) / 2) : 0;
    img.clipPath = radius > 0
      ? new Rect({ width: el.width, height: el.height, rx: radius, ry: radius, originX: "center", originY: "center" })
      : undefined;

    this.applyZoom(); // sizes the canvas (logical × zoom) and renders immediately
  }

  // ---- zoom ----
  private applyZoom(): void {
    if (!this.logicalW || !this.logicalH) return;
    this.canvas.setZoom(this.zoom);
    this.canvas.setDimensions({
      width: Math.round(this.logicalW * this.zoom),
      height: Math.round(this.logicalH * this.zoom),
    });
    this.canvas.renderAll();
    this.onZoom(this.zoom);
  }

  setZoomLevel(z: number): void {
    this.zoom = clamp(z, 0.1, 5);
    this.applyZoom();
  }
  zoomBy(factor: number): void {
    this.setZoomLevel(this.zoom * factor);
  }
  resetZoom(): void {
    this.setZoomLevel(1);
  }
  getZoom(): number {
    return this.zoom;
  }
  /** Fit the whole composition (including backdrop) into the given viewport,
   *  never upscaling past 100%. */
  fit(viewportW: number, viewportH: number): void {
    if (!this.logicalW || !this.logicalH) return;
    const z = Math.min(viewportW / this.logicalW, viewportH / this.logicalH, 1);
    this.setZoomLevel(z);
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

  /** Is the current selection a text object? */
  isTextSelected(): boolean {
    const o = this.canvas.getActiveObject();
    return !!o && (o.type === "i-text" || o.type === "textbox");
  }

  /** Read the selected text object's typographic properties (for the UI). */
  textProps(): { fontFamily: string; fontSize: number; bold: boolean; italic: boolean; underline: boolean; align: string } | null {
    const o = this.canvas.getActiveObject() as any;
    if (!o || (o.type !== "i-text" && o.type !== "textbox")) return null;
    return {
      fontFamily: o.fontFamily ?? "",
      fontSize: o.fontSize ?? this.style.fontSize,
      bold: o.fontWeight === "bold" || o.fontWeight === 700,
      italic: o.fontStyle === "italic",
      underline: !!o.underline,
      align: o.textAlign ?? "left",
    };
  }

  /** Apply typographic properties to the selected text object(s). */
  setTextStyle(props: Record<string, any>): void {
    const objs = this.canvas.getActiveObjects().filter(
      (o) => o.type === "i-text" || o.type === "textbox",
    );
    if (!objs.length) return;
    for (const o of objs) o.set(props);
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
    if (this.tool === "rect" || this.tool === "crop" || this.tool === "spotlight") {
      this.draft = new Rect({ left: p.x, top: p.y, width: 1, height: 1, ...common,
        fill: this.tool === "rect" ? "transparent" : "rgba(0,0,0,0.15)" });
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
    if (this.tool === "rect" || this.tool === "crop" || this.tool === "spotlight") {
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
    if (this.tool === "spotlight" && this.draft) {
      const { left, top, width, height } = this.draft;
      this.canvas.remove(this.draft);
      this.draft = null;
      if (width > 8 && height > 8) {
        const overlay = this.addSpotlight(left, top, width, height);
        this.finishInsert(overlay);
      } else {
        this.snapshot();
      }
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
    // Canvas coords include the backdrop offset; sample from the original image.
    const src = { left: r.left - this.offset, top: r.top - this.offset, width: r.width, height: r.height };
    const url = redactRegion(this.baseEl, src, mode, 12);
    const img = await FabricImage.fromURL(url);
    img.set({ left: r.left, top: r.top });
    this.canvas.add(img);
    this.canvas.renderAll();
    return img;
  }

  /** Dim everything except the chosen rectangle (a competitor staple). */
  private addSpotlight(left: number, top: number, width: number, height: number): Rect {
    const overlay = new Rect({
      left: 0, top: 0, width: this.canvas.getWidth(), height: this.canvas.getHeight(),
      fill: "rgba(0,0,0,0.55)", selectable: false,
      clipPath: new Rect({ left, top, width, height, absolutePositioned: true, inverted: true }),
    });
    this.canvas.add(overlay);
    return overlay;
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
  // The backdrop is real canvas content now, so export is just the canvas.
  async export(format: "png" | "jpg", scale: 1 | 2 | 3): Promise<string> {
    const z = this.zoom;
    // Render at 1:1 so the export is independent of the on-screen zoom level.
    if (z !== 1) {
      this.canvas.setZoom(1);
      this.canvas.setDimensions({ width: this.logicalW, height: this.logicalH });
    }
    this.canvas.discardActiveObject();
    this.canvas.renderAll();
    const png = this.canvas.toDataURL({ format: "png", multiplier: scale } as any);
    if (z !== 1) this.applyZoom();
    if (format === "png") return png;
    const img = await loadImage(png);
    return this.flatten(img, "image/jpeg");
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
}
