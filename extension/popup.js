// Shotmark popup: capture the visible area or a stitched full-page screenshot,
// stash it in storage, and open the editor. Uses activeTab + scripting only.

const statusEl = document.getElementById("status");
const setStatus = (s) => { statusEl.textContent = s; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function openEditor(dataUrl) {
  if (dataUrl) await chrome.storage.local.set({ pendingCapture: dataUrl });
  else await chrome.storage.local.remove("pendingCapture");
  await chrome.tabs.create({ url: chrome.runtime.getURL("app/index.html") });
  window.close();
}

async function captureVisible() {
  setStatus("Capturing…");
  const tab = await activeTab();
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
    await openEditor(dataUrl);
  } catch (e) {
    setStatus("Can't capture this page — opening empty editor.");
    await sleep(900);
    await openEditor(null);
  }
}

// Chrome caps captureVisibleTab at ~2 calls/sec; stay safely under it.
const CAPTURE_INTERVAL = 650;
const MAX_SLICES = 60;

async function captureFullPage() {
  setStatus("Measuring page…");
  const tab = await activeTab();
  try {
    // Disable smooth scrolling and hide scrollbars; read page metrics.
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
    let target = 0;
    let lastCapture = 0;
    for (let i = 0; i < MAX_SLICES; i++) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id }, func: (y) => window.scrollTo(0, y), args: [target],
      });
      // throttle so we never exceed the capture rate limit
      const wait = CAPTURE_INTERVAL - (Date.now() - lastCapture);
      if (wait > 0) await sleep(wait);
      const [{ result: actualY }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id }, func: () => window.scrollY,
      });
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
      lastCapture = Date.now();
      shots.push({ y: actualY, dataUrl });
      setStatus(`Capturing… ${Math.min(100, Math.round(((actualY + m.view) / m.total) * 100))}%`);
      if (actualY + m.view >= m.total - 1) break;
      target = actualY + m.view;
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id }, func: (y) => window.scrollTo(0, y), args: [m.startY],
    });

    setStatus("Stitching…");
    const imgs = await Promise.all(shots.map((s) => loadImg(s.dataUrl)));
    const scale = imgs[0].width / m.width; // capture is in device pixels
    const canvas = document.createElement("canvas");
    canvas.width = imgs[0].width;
    canvas.height = Math.round(m.total * scale);
    const ctx = canvas.getContext("2d");
    // draw bottom-up so later (correct) slices overwrite any overlap seam
    for (let i = shots.length - 1; i >= 0; i--) {
      ctx.drawImage(imgs[i], 0, Math.round(shots[i].y * scale));
    }
    await openEditor(canvas.toDataURL("image/png"));
  } catch (e) {
    setStatus("Full-page failed: " + (e && e.message ? e.message : String(e)));
  }
}

document.getElementById("visible").addEventListener("click", captureVisible);
document.getElementById("full").addEventListener("click", captureFullPage);
document.getElementById("blank").addEventListener("click", () => openEditor(null));
