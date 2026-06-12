import { Editor, type Tool } from "./editor";
import { downloadDataUrl, copyToClipboard } from "./exporter";
import { resolveScale } from "./exporter";

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

const canvasEl = $("#canvas") as HTMLCanvasElement;
const editor = new Editor(canvasEl);

const dropzone = $("#dropzone");
const canvasWrap = $("#canvas-wrap");
const toastEl = $("#toast");

function toast(msg: string): void {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 1800);
}

async function load(url: string): Promise<void> {
  await editor.loadImageFromUrl(url);
  dropzone.hidden = true;
  canvasWrap.hidden = false;
  selectTool("select");
  refresh();
}

function fileToUrl(file: File): Promise<string> {
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.readAsDataURL(file);
  });
}

// ---- tools ----
const KEYS: Record<string, Tool> = {
  v: "select", a: "arrow", r: "rect", e: "ellipse", l: "line",
  p: "pen", h: "highlighter", t: "text", n: "badge", b: "blur", x: "pixelate", c: "crop",
};

function selectTool(tool: Tool): void {
  editor.setTool(tool);
  document.querySelectorAll(".tool").forEach((b) =>
    b.classList.toggle("active", (b as HTMLElement).dataset.tool === tool));
}

document.querySelectorAll(".tool").forEach((btn) => {
  btn.addEventListener("click", () => selectTool((btn as HTMLElement).dataset.tool as Tool));
});

function refresh(): void {
  ($("#undo") as HTMLButtonElement).disabled = !editor.canUndo();
  ($("#redo") as HTMLButtonElement).disabled = !editor.canRedo();
}
editor.onChange = refresh;

// ---- style ----
$("#color").addEventListener("input", (e) => { editor.style.color = (e.target as HTMLInputElement).value; editor.setTool(editor.getTool()); });
$("#width").addEventListener("input", (e) => { editor.style.strokeWidth = +(e.target as HTMLInputElement).value; editor.setTool(editor.getTool()); });

// ---- actions ----
$("#undo").addEventListener("click", () => editor.undo());
$("#redo").addEventListener("click", () => editor.redo());
$("#delete").addEventListener("click", () => editor.deleteSelected());

// ---- beautify ----
const sync = () => {
  editor.beautify.enabled = ($("#b-enabled") as HTMLInputElement).checked;
  editor.beautify.background = ($("#b-bg") as HTMLSelectElement).value;
  editor.beautify.padding = +($("#b-pad") as HTMLInputElement).value;
  editor.beautify.radius = +($("#b-radius") as HTMLInputElement).value;
  editor.beautify.shadow = +($("#b-shadow") as HTMLInputElement).value;
};
["#b-enabled", "#b-bg", "#b-pad", "#b-radius", "#b-shadow"].forEach((s) =>
  $(s).addEventListener("input", sync));

// ---- export ----
function currentScale(): 1 | 2 | 3 {
  return resolveScale(+($("#scale") as HTMLSelectElement).value);
}
$("#download").addEventListener("click", async () => {
  downloadDataUrl(await editor.export("png", currentScale()), "png");
});
$("#download-jpg").addEventListener("click", async () => {
  downloadDataUrl(await editor.export("jpg", currentScale()), "jpg");
});
$("#copy").addEventListener("click", async () => {
  const ok = await copyToClipboard(await editor.export("png", currentScale()));
  toast(ok ? "Copied to clipboard" : "Clipboard not available — use Download");
});

// ---- input sources ----
$("#pick").addEventListener("click", () => ($("#file") as HTMLInputElement).click());
$("#file").addEventListener("change", async (e) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f) await load(await fileToUrl(f));
});
$("#capture").addEventListener("click", async () => {
  try {
    const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
    const track = stream.getVideoTracks()[0];
    const bitmap = await (new (window as any).ImageCapture(track)).grabFrame();
    track.stop();
    const c = document.createElement("canvas");
    c.width = bitmap.width; c.height = bitmap.height;
    c.getContext("2d")!.drawImage(bitmap, 0, 0);
    await load(c.toDataURL("image/png"));
  } catch {
    toast("Screen capture not available in this browser");
  }
});

// drag & drop
["dragover", "dragenter"].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add("drag"); }));
["dragleave", "drop"].forEach((ev) =>
  dropzone.addEventListener(ev, () => dropzone.classList.remove("drag")));
dropzone.addEventListener("drop", async (e) => {
  e.preventDefault();
  const f = (e as DragEvent).dataTransfer?.files?.[0];
  if (f && f.type.startsWith("image/")) await load(await fileToUrl(f));
});

// paste
window.addEventListener("paste", async (e) => {
  const items = (e as ClipboardEvent).clipboardData?.items ?? [];
  for (const it of items) {
    if (it.type.startsWith("image/")) {
      const f = it.getAsFile();
      if (f) await load(await fileToUrl(f));
    }
  }
});

// keyboard shortcuts
window.addEventListener("keydown", (e) => {
  const editing = (e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.isContentEditable;
  if (editing) return;
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    e.shiftKey ? editor.redo() : editor.undo();
    return;
  }
  if (e.key === "Backspace" || e.key === "Delete") { editor.deleteSelected(); return; }
  const t = KEYS[e.key.toLowerCase()];
  if (t && editor.hasImage()) selectTool(t);
});

// expose for E2E tests
(window as any).__shotmark = { editor, load };
