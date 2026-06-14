// Shotmark popup: pick a capture scope (visible / full page) and an action
// (copy to clipboard / edit / download PNG). Capture and action compose, so
// the six buttons are just scope × action. activeTab + scripting for capture,
// downloads for save, clipboardWrite for copy.

const statusEl = document.getElementById("status");
const setStatus = (s) => { statusEl.textContent = s; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const closeSoon = () => setTimeout(() => window.close(), 700);

function stamp() {
  const d = new Date(), p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
function loadImg(dataUrl) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = dataUrl;
  });
}
async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// ---- capture (scope) ----
async function captureVisible() {
  const tab = await activeTab();
  return chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
}

const CAPTURE_INTERVAL = 650;
const MAX_SLICES = 60;

async function captureFull() {
  const tab = await activeTab();
  const [{ result: m }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      document.documentElement.style.scrollBehavior = "auto";
      const total = Math.max(
        document.body.scrollHeight, document.documentElement.scrollHeight,
        document.body.offsetHeight, document.documentElement.offsetHeight,
      );
      return { total, view: window.innerHeight, width: document.documentElement.clientWidth, startY: window.scrollY };
    },
  });

  const shots = [];
  let target = 0, lastCapture = 0;
  for (let i = 0; i < MAX_SLICES; i++) {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: (y) => window.scrollTo(0, y), args: [target] });
    const wait = CAPTURE_INTERVAL - (Date.now() - lastCapture);
    if (wait > 0) await sleep(wait);
    const [{ result: actualY }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => window.scrollY });
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
    lastCapture = Date.now();
    shots.push({ y: actualY, dataUrl });
    setStatus(`Capturing… ${Math.min(100, Math.round(((actualY + m.view) / m.total) * 100))}%`);
    if (actualY + m.view >= m.total - 1) break;
    target = actualY + m.view;
  }
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: (y) => window.scrollTo(0, y), args: [m.startY] });

  setStatus("Stitching…");
  const imgs = await Promise.all(shots.map((s) => loadImg(s.dataUrl)));
  const scale = imgs[0].width / m.width;
  const canvas = document.createElement("canvas");
  canvas.width = imgs[0].width;
  canvas.height = Math.round(m.total * scale);
  const ctx = canvas.getContext("2d");
  for (let i = shots.length - 1; i >= 0; i--) ctx.drawImage(imgs[i], 0, Math.round(shots[i].y * scale));
  return canvas.toDataURL("image/png");
}

async function capture(scope) {
  setStatus(scope === "full" ? "Measuring page…" : "Capturing…");
  return scope === "full" ? captureFull() : captureVisible();
}

// ---- actions ----
async function actionEdit(dataUrl) {
  await chrome.storage.local.set({ pendingCapture: dataUrl });
  await chrome.tabs.create({ url: chrome.runtime.getURL("app/index.html") });
  window.close();
}
async function actionCopy(dataUrl) {
  const blob = await (await fetch(dataUrl)).blob();
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
  setStatus("Copied to clipboard ✓");
  closeSoon();
}
async function actionDownload(dataUrl) {
  const blob = await (await fetch(dataUrl)).blob();
  const url = URL.createObjectURL(blob);
  await chrome.downloads.download({ url, filename: `shotmark-${stamp()}.png`, saveAs: false });
  setStatus("Saved to Downloads ✓");
  setTimeout(() => { URL.revokeObjectURL(url); window.close(); }, 900);
}
const ACTIONS = { edit: actionEdit, copy: actionCopy, download: actionDownload };

// ---- wire the 6 buttons (scope × action) ----
document.querySelectorAll(".row button").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const { scope, action } = btn.dataset;
    document.querySelectorAll("button").forEach((b) => (b.disabled = true));
    try {
      const dataUrl = await capture(scope);
      await ACTIONS[action](dataUrl);
    } catch (e) {
      setStatus("Failed: " + (e && e.message ? e.message : String(e)));
      document.querySelectorAll("button").forEach((b) => (b.disabled = false));
    }
  });
});

document.getElementById("ver").textContent = "v" + chrome.runtime.getManifest().version;
