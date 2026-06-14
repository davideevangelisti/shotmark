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

async function captureFullPage() {
  setStatus("Measuring page…");
  const tab = await activeTab();
  try {
    const [{ result: m }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({
        total: document.documentElement.scrollHeight,
        view: window.innerHeight,
        width: document.documentElement.clientWidth,
        startY: window.scrollY,
      }),
    });

    const shots = [];
    let target = 0;
    // capture viewport-sized slices top to bottom, reading the real scroll
    // position each time so the final (clamped) slice lines up
    while (true) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id }, func: (y) => window.scrollTo(0, y), args: [target],
      });
      await sleep(420); // let it render + respect captureVisibleTab rate limit
      const [{ result: actualY }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id }, func: () => window.scrollY,
      });
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
      shots.push({ y: actualY, dataUrl });
      setStatus(`Capturing… ${Math.min(100, Math.round(((actualY + m.view) / m.total) * 100))}%`);
      if (actualY + m.view >= m.total) break;
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
    shots.forEach((s, i) => ctx.drawImage(imgs[i], 0, Math.round(s.y * scale)));
    await openEditor(canvas.toDataURL("image/png"));
  } catch (e) {
    setStatus("Full-page capture failed on this page.");
    await sleep(1200);
    await openEditor(null);
  }
}

document.getElementById("visible").addEventListener("click", captureVisible);
document.getElementById("full").addEventListener("click", captureFullPage);
document.getElementById("blank").addEventListener("click", () => openEditor(null));
