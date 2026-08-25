export const SVG_NS = 'http://www.w3.org/2000/svg';

export function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
  children: (SVGElement | null)[] = [],
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  for (const c of children) if (c) el.appendChild(c);
  return el as SVGElementTagNameMap[K];
}

export function textEl(x: number, y: number, content: string, attrs: Record<string, string | number> = {}): SVGTextElement {
  const el = svgEl('text', { x, y, ...attrs });
  el.textContent = content;
  return el;
}

/**
 * Shrinks the font size (never the content) so `text` fits within `availableWidthMm`, using a
 * rough character-width estimate (no canvas measurement available for a detached SVG). Prefer
 * this over cutting characters off — a shortened word is a minor inconvenience, but a shortened
 * number silently reads as a different, wrong quantity.
 *
 * The shrink is capped at `minRatio` of the base size (default 75%) so a table doesn't end up
 * with wildly inconsistent letter sizes row to row — beyond that floor the column's clip-path
 * takes over and crops the overflow cleanly instead of shrinking further.
 */
export function fitFontSize(text: string, availableWidthMm: number, baseFontSizeMm: number, minRatio = 0.75): number {
  if (!text) return baseFontSizeMm;
  const estimatedWidth = text.length * baseFontSizeMm * 0.55;
  if (estimatedWidth <= availableWidthMm) return baseFontSizeMm;
  const minFontSizeMm = baseFontSizeMm * minRatio;
  return Math.max(minFontSizeMm, baseFontSizeMm * (availableWidthMm / estimatedWidth));
}
