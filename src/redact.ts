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
    // Blur a PADDED sample so the filter has real surrounding pixels, then crop
    // the opaque center. (Blurring an exact-fit region bleeds in transparent
    // edges and fades the overlay, revealing the original underneath.)
    const s = Math.max(6, strength);
    const pad = Math.ceil(s * 2);
    const bw = w + pad * 2, bh = h + pad * 2;
    const big = document.createElement("canvas");
    big.width = bw; big.height = bh;
    const bctx = big.getContext("2d")!;
    bctx.filter = `blur(${s}px)`;
    bctx.drawImage(source, region.left - pad, region.top - pad, bw, bh, 0, 0, bw, bh);
    bctx.filter = "none";
    // second pass compounds the blur (still padded, so it stays opaque)
    const tmp = document.createElement("canvas");
    tmp.width = bw; tmp.height = bh;
    tmp.getContext("2d")!.drawImage(big, 0, 0);
    bctx.clearRect(0, 0, bw, bh);
    bctx.filter = `blur(${s}px)`;
    bctx.drawImage(tmp, 0, 0);
    bctx.filter = "none";
    // crop the fully-covered centre into the output
    ctx.drawImage(big, pad, pad, w, h, 0, 0, w, h);
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
