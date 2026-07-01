// Pure scheduler + path math for drifting comets / shooting stars. The entity owns
// the pooled Graphics; this module owns the "when" and "where" so it is testable
// and deterministic (RNG injected). Comets are cheap vector strokes — NOT particles.
export interface CometPath {
  x0: number; y0: number; x1: number; y1: number; lifeMs: number;
}

export function dueForComet(lastSpawnMs: number, nowMs: number, gapMs: number): boolean {
  return nowMs - lastSpawnMs >= gapMs;
}

export function cometProgress(bornMs: number, nowMs: number, lifeMs: number): number {
  if (lifeMs <= 0) return 1;
  const t = (nowMs - bornMs) / lifeMs;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

// A diagonal streak entering from the top/side and exiting the opposite edge.
export function pickCometPath(
  rng: () => number, width: number, height: number, minLifeMs: number, maxLifeMs: number,
): CometPath {
  const fromLeft = rng() < 0.5;
  const x0 = fromLeft ? -40 : width + 40;
  const y0 = rng() * height * 0.5;                 // upper half
  const x1 = fromLeft ? width + 40 : -40;
  const y1 = y0 + height * (0.4 + rng() * 0.4);    // always drifts downward
  const lifeMs = minLifeMs + rng() * (maxLifeMs - minLifeMs);
  return { x0, y0, x1, y1, lifeMs };
}
