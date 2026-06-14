// Shotmark extension service worker (MV3).
// Clicking the toolbar icon captures the visible tab and opens it in the editor.
// activeTab (granted by the click) is enough — no broad host permissions.

chrome.action.onClicked.addListener(async (tab) => {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
    await chrome.storage.local.set({ pendingCapture: dataUrl });
  } catch (e) {
    // Some pages (chrome://, the store, PDFs) can't be captured — open empty so
    // the user can still paste / drop / pick a file.
    await chrome.storage.local.remove("pendingCapture");
  }
  await chrome.tabs.create({ url: chrome.runtime.getURL("app/index.html") });
});
