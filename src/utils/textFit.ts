import { clamp } from './MathUtils';

// Pure, testable helpers that keep on-screen text from colliding with fixed
// HUD chrome (e.g. the top-right nav toolbar) — no Phaser dependency. Callers
// pass in pixel widths measured from their own Text objects.

/**
 * Uniform scale factor to shrink `measuredWidth` down to fit within
 * `maxWidth`, floored at `minScale` and never upscaled past 1.
 */
export function fitScale(measuredWidth: number, maxWidth: number, minScale: number): number {
  if (measuredWidth <= 0) return 1;
  return clamp(maxWidth / measuredWidth, minScale, 1);
}

/**
 * Progressively drops trailing characters (appending `ellipsis`) until
 * `measure(candidate) <= maxWidth`, or falls back to the bare ellipsis if
 * even a single character won't fit. `measure` is injected so this stays
 * pure/testable — callers pass a real text-measurement function (Phaser Text
 * width) in production and a fake one in tests.
 */
export function truncateToWidth(
  text: string,
  maxWidth: number,
  measure: (candidate: string) => number,
  ellipsis: string,
): string {
  if (measure(text) <= maxWidth) return text;
  for (let len = text.length - 1; len > 0; len--) {
    const candidate = text.slice(0, len) + ellipsis;
    if (measure(candidate) <= maxWidth) return candidate;
  }
  return ellipsis;
}
