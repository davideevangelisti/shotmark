// Redaction: produce a blurred or pixelated version of a rectangular region
// of a source image. Works on an offscreen canvas; returns a data URL the
// editor places back over the region as a Fabric image.

export type RedactMode = "blur" | "pixelate";

interface Region { left: number; top: number; width: number; height: number; }

export function redactRegion(
  source: CanvasImageSource,
  region: Region,
  mode: RedactMode,
  strength = 10,
): string {
  const w = Math.max(1, Math.round(region.width));
  const h = Math.max(1, Math.round(region.height));
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;

  if (mode === "blur") {
    // Canvas filter blur is widely supported and fast enough here.
    ctx.filter = `blur(${Math.max(2, strength)}px)`;
    ctx.drawImage(source, region.left, region.top, w, h, 0, 0, w, h);
    ctx.filter = "none";
  } else {
    // Pixelate: downscale then upscale with smoothing off.
    const factor = Math.max(2, Math.round(strength));
    const sw = Math.max(1, Math.floor(w / factor));
    const sh = Math.max(1, Math.floor(h / factor));
    const tmp = document.createElement("canvas");
    tmp.width = sw;
    tmp.height = sh;
    const tctx = tmp.getContext("2d")!;
    tctx.drawImage(source, region.left, region.top, w, h, 0, 0, sw, sh);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, 0, 0, sw, sh, 0, 0, w, h);
  }
  return out.toDataURL("image/png");
}
