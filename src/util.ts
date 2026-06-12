// Pure helpers — no DOM, no Fabric. Fully unit-testable.

export interface Point { x: number; y: number; }

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Normalize a drag (start,end) into a top-left rect with positive size. */
export function normalizeRect(a: Point, b: Point) {
  return {
    left: Math.min(a.x, b.x),
    top: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Allowed export scales. */
export const SCALES = [1, 2, 3] as const;
export type Scale = (typeof SCALES)[number];

export function isValidScale(n: number): n is Scale {
  return (SCALES as readonly number[]).includes(n);
}

/** Timestamped, filesystem-safe export filename. */
export function exportFilename(ext: string, now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp =
    `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}` +
    `-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
  const clean = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "png";
  return `shotmark-${stamp}.${clean}`;
}

/** #rrggbb -> rgba() string with alpha 0..1. Tolerates shorthand and bad input. */
export function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(h)) return `rgba(0,0,0,${clamp(alpha, 0, 1)})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${clamp(alpha, 0, 1)})`;
}

/** Geometry for an arrowhead: two short segments from the tip. */
export function arrowHead(from: Point, to: Point, size: number): [Point, Point] {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const spread = Math.PI / 7;
  return [
    { x: to.x - size * Math.cos(angle - spread), y: to.y - size * Math.sin(angle - spread) },
    { x: to.x - size * Math.cos(angle + spread), y: to.y - size * Math.sin(angle + spread) },
  ];
}
