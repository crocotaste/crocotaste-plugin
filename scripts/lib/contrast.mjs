// Pairs a brand book must keep readable, with the WCAG 2.x minimum for each.
const CONTRAST_PAIRS = [
  { fg: "color-text", bg: "color-canvas", min: 4.5 },
  { fg: "color-text", bg: "color-surface", min: 4.5 },
  { fg: "color-text", bg: "color-surface-raised", min: 4.5 },
  { fg: "color-text-muted", bg: "color-surface", min: 4.5 },
  { fg: "color-text-faint", bg: "color-surface", min: 3 },
  { fg: "color-primary-text", bg: "color-primary", min: 4.5 },
  { fg: "color-text-inverse", bg: "color-primary", min: 4.5 },
  { fg: "color-danger", bg: "color-surface", min: 3 },
  { fg: "color-success", bg: "color-surface", min: 3 },
  { fg: "color-warning", bg: "color-surface", min: 3 },
  { fg: "color-focus", bg: "color-canvas", min: 3 },
];

function linear(channel) {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance({ r, g, b }) {
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

// A translucent text color is judged as it lands on its background.
function composite(fg, bg) {
  const alpha = fg.a ?? 1;
  const mix = (f, b) => f * alpha + b * (1 - alpha);
  return { r: mix(fg.r, bg.r), g: mix(fg.g, bg.g), b: mix(fg.b, bg.b) };
}

function contrastRatio(fg, bg) {
  const a = luminance(composite(fg, bg));
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export { CONTRAST_PAIRS, contrastRatio, luminance };
