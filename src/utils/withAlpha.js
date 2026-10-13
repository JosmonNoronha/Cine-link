/**
 * Returns `color` with the given opacity (0–1). Handles #rgb, #rgba, #rrggbb,
 * #rrggbbaa and rgb()/rgba(); anything else (named colours, etc.) is returned
 * unchanged. Safer than string-concatenating a hex suffix, which silently
 * produces an opaque/invalid colour when the theme colour isn't a plain #rrggbb.
 */
export default function withAlpha(color, alpha) {
  if (typeof color !== "string") return color;
  const a = Math.max(0, Math.min(1, alpha));
  const c = color.trim();

  let m = /^#([0-9a-f]{3,4})$/i.exec(c);
  if (m) {
    const [r, g, b] = m[1].slice(0, 3).split("").map((x) => parseInt(x + x, 16));
    return `rgba(${r},${g},${b},${a})`;
  }
  m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(c);
  if (m) {
    const n = parseInt(m[1], 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(c);
  if (m) return `rgba(${m[1]},${m[2]},${m[3]},${a})`;
  return color;
}