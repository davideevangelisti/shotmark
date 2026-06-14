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
  p: "pen", h: "highlighter", t: "text", n: "badge", b: "blur", x: "pixelate",
  s: "spotlight", c: "crop",
};

function highlightTool(tool: Tool): void {
  document.querySelectorAll(".tool").forEach((b) =>
    b.classList.toggle("active", (b as HTMLElement).dataset.tool === tool));
}
function selectTool(tool: Tool): void {
  editor.setTool(tool); // fires onToolChange -> highlightTool, covering auto-switches too
}
// keep the toolbar in sync whether the tool changed by click, shortcut, or auto-return
editor.onToolChange = highlightTool;

document.querySelectorAll(".tool").forEach((btn) => {
  btn.addEventListener("click", () => selectTool((btn as HTMLElement).dataset.tool as Tool));
});

function refresh(): void {
  ($("#undo") as HTMLButtonElement).disabled = !editor.canUndo();
  ($("#redo") as HTMLButtonElement).disabled = !editor.canRedo();
}
editor.onChange = refresh;

// ---- style ----
$("#color").addEventListener("input", (e) => {
  editor.style.color = (e.target as HTMLInputElement).value;
  editor.setTool(editor.getTool()); // refresh brush color
  editor.applyStyleToSelection();   // recolor whatever is selected
});
$("#size").addEventListener("input", (e) => {
  const v = +(e.target as HTMLInputElement).value;
  editor.style.strokeWidth = v;
  editor.style.fontSize = Math.round(v * 7); // one slider controls thickness and text size
  editor.setTool(editor.getTool());
  editor.applyStyleToSelection();
});

// ---- actions ----
$("#undo").addEventListener("click", () => editor.undo());
$("#redo").addEventListener("click", () => editor.redo());
$("#delete").addEventListener("click", () => editor.deleteSelected());

// ---- backdrop (applied live to the canvas, identical to export) ----
const sync = () => {
  editor.beautify.enabled = ($("#b-enabled") as HTMLInputElement).checked;
  editor.beautify.background = ($("#b-bg") as HTMLSelectElement).value;
  editor.beautify.padding = +($("#b-pad") as HTMLInputElement).value;
  editor.beautify.radius = +($("#b-radius") as HTMLInputElement).value;
  editor.beautify.shadow = +($("#b-shadow") as HTMLInputElement).value;
  if (editor.hasImage()) editor.applyBackdrop();
};
["#b-enabled", "#b-bg", "#b-pad", "#b-radius", "#b-shadow"].forEach((s) =>
  $(s).addEventListener("input", sync));

// ---- text properties (shown when a text object is selected) ----
const textPanel = $("#text-panel");
editor.onSelection = () => {
  const props = editor.textProps();
  textPanel.hidden = !props;
  if (!props) return;
  ($("#t-font") as HTMLSelectElement).value = props.fontFamily;
  ($("#t-size") as HTMLInputElement).value = String(Math.round(props.fontSize));
  $("#t-bold").classList.toggle("on", props.bold);
  $("#t-italic").classList.toggle("on", props.italic);
  $("#t-underline").classList.toggle("on", props.underline);
};
$("#t-font").addEventListener("change", (e) =>
  editor.setTextStyle({ fontFamily: (e.target as HTMLSelectElement).value }));
$("#t-size").addEventListener("input", (e) =>
  editor.setTextStyle({ fontSize: +(e.target as HTMLInputElement).value }));
$("#t-bold").addEventListener("click", () => {
  const on = !editor.textProps()?.bold;
  editor.setTextStyle({ fontWeight: on ? "bold" : "normal" });
  $("#t-bold").classList.toggle("on", on);
});
$("#t-italic").addEventListener("click", () => {
  const on = !editor.textProps()?.italic;
  editor.setTextStyle({ fontStyle: on ? "italic" : "normal" });
  $("#t-italic").classList.toggle("on", on);
});
$("#t-underline").addEventListener("click", () => {
  const on = !editor.textProps()?.underline;
  editor.setTextStyle({ underline: on });
  $("#t-underline").classList.toggle("on", on);
});
$("#t-left").addEventListener("click", () => editor.setTextStyle({ textAlign: "left" }));
$("#t-center").addEventListener("click", () => editor.setTextStyle({ textAlign: "center" }));
$("#t-right").addEventListener("click", () => editor.setTextStyle({ textAlign: "right" }));

// ---- resizable toolbar ----
const toolbarEl = $("#toolbar");
const resizer = $("#resizer");
const savedWidth = localStorage.getItem("sm.toolbarWidth");
if (savedWidth) toolbarEl.style.width = savedWidth + "px";
let resizing = false;
resizer.addEventListener("pointerdown", (e) => {
  resizing = true;
  resizer.classList.add("dragging");
  resizer.setPointerCapture((e as PointerEvent).pointerId);
});
window.addEventListener("pointermove", (e) => {
  if (!resizing) return;
  const w = Math.max(180, Math.min(460, (e as PointerEvent).clientX - toolbarEl.getBoundingClientRect().left));
  toolbarEl.style.width = w + "px";
});
window.addEventListener("pointerup", () => {
  if (!resizing) return;
  resizing = false;
  resizer.classList.remove("dragging");
  localStorage.setItem("sm.toolbarWidth", String(parseInt(toolbarEl.style.width, 10)));
});

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

// ---- OCR ----
const ocrPanel = $("#ocr-panel");
const ocrText = $("#ocr-text") as HTMLTextAreaElement;
const ocrStatus = $("#ocr-status");
let ocrRunning = false;

async function runOcr(): Promise<void> {
  if (!editor.hasImage() || ocrRunning) return;
  ocrRunning = true;
  ocrPanel.hidden = false;
  ocrText.value = "";
  ocrStatus.textContent = "Starting…";
  try {
    const text = await editor.ocr((p) => {
      ocrStatus.textContent = `${p.status} ${Math.round(p.progress * 100)}%`;
    });
    ocrText.value = text || "(no text found)";
    ocrStatus.textContent = text ? "Done" : "No text detected";
  } catch {
    ocrStatus.textContent = "OCR failed — try again";
  } finally {
    ocrRunning = false;
  }
}

$("#ocr").addEventListener("click", runOcr);
$("#ocr-close").addEventListener("click", () => { ocrPanel.hidden = true; });
$("#ocr-copy").addEventListener("click", async () => {
  await navigator.clipboard?.writeText(ocrText.value).catch(() => {});
  toast("Text copied");
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
  if (e.key.toLowerCase() === "o" && editor.hasImage()) { runOcr(); return; }
  const t = KEYS[e.key.toLowerCase()];
  if (t && editor.hasImage()) selectTool(t);
});

// expose for E2E tests
(window as any).__shotmark = { editor, load };

// Extension context: pick up a captured screenshot from the background worker,
// and hide OCR (its engine assets aren't self-hosted yet — web-only for now).
declare const chrome: any;
(async () => {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      (document.getElementById("ocr") as HTMLElement | null)?.style.setProperty("display", "none");
      const { pendingCapture } = await chrome.storage.local.get("pendingCapture");
      if (pendingCapture) {
        await load(pendingCapture);
        chrome.storage.local.remove("pendingCapture");
      }
    }
  } catch {
    /* not running as an extension */
  }
})();
