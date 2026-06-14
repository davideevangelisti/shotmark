// Background / padding / shadow / corner settings for the "beautify" panel.
// Pure config + a CSS-gradient builder; the editor applies these when rendering
// the final composite. Kept separate so the gradient logic is unit-testable.

export interface BeautifySettings {
  enabled: boolean;
  padding: number;        // px around the screenshot
  radius: number;         // corner radius of the screenshot
  shadow: number;         // shadow blur (0 = none)
  background: string;     // a CSS color or one of the gradient preset keys
}

export const GRADIENT_PRESETS: Record<string, [string, string]> = {
  sunset: ["#ff7e5f", "#feb47b"],
  ocean: ["#2193b0", "#6dd5ed"],
  grape: ["#8e2de2", "#4a00e0"],
  mint: ["#11998e", "#38ef7d"],
  slate: ["#232526", "#414345"],
  candy: ["#ff9a9e", "#fecfef"],
};

export const DEFAULT_BEAUTIFY: BeautifySettings = {
  enabled: false,
  padding: 80,
  radius: 12,
  shadow: 30,
  background: "sunset",
};

/** Resolve a background key/color into a canvas-paintable fill descriptor. */
export function resolveBackground(
  background: string,
): { type: "gradient"; stops: [string, string] } | { type: "solid"; color: string } {
  const preset = GRADIENT_PRESETS[background];
  if (preset) return { type: "gradient", stops: preset };
  return { type: "solid", color: background };
}
