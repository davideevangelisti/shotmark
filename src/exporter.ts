// Export helpers. The data-URL producers take a canvas element so they stay
// testable without Fabric; filename/format logic is pure.

import { exportFilename, isValidScale } from "./util";

export type Format = "png" | "jpg";

export function mimeFor(format: Format): string {
  return format === "jpg" ? "image/jpeg" : "image/png";
}

/** Trigger a browser download of a data URL. */
export function downloadDataUrl(dataUrl: string, format: Format): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = exportFilename(format);
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Convert a data URL to a Blob (for clipboard writes). */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(",");
  const mime = /:(.*?);/.exec(head)?.[1] ?? "image/png";
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Copy a PNG data URL to the clipboard. Returns false if unsupported. */
export async function copyToClipboard(dataUrl: string): Promise<boolean> {
  try {
    if (!navigator.clipboard || typeof ClipboardItem === "undefined") return false;
    const blob = dataUrlToBlob(dataUrl);
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    return true;
  } catch {
    return false;
  }
}

export function resolveScale(n: number): 1 | 2 | 3 {
  return isValidScale(n) ? n : 1;
}
