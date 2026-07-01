import { describe, it, expect } from 'vitest';
import { dueForComet, cometProgress, pickCometPath } from './comets';
import { mulberry32 } from './endless';

describe('dueForComet', () => {
  it('is false before the gap elapses', () => {
    expect(dueForComet(1000, 1000 + 3000, 4200)).toBe(false);
  });
  it('is true once the gap elapses', () => {
    expect(dueForComet(1000, 1000 + 4200, 4200)).toBe(true);
  });
});

describe('cometProgress', () => {
  it('clamps to 0..1 across its life', () => {
    expect(cometProgress(0, -10, 1000)).toBe(0);
    expect(cometProgress(0, 500, 1000)).toBeCloseTo(0.5, 5);
    expect(cometProgress(0, 5000, 1000)).toBe(1);
  });
});

describe('pickCometPath', () => {
  it('is deterministic for a given seed', () => {
    const a = pickCometPath(mulberry32(7), 390, 844, 900, 1600);
    const b = pickCometPath(mulberry32(7), 390, 844, 900, 1600);
    expect(a).toEqual(b);
  });

  it('enters off-screen, starts in the upper half, drifts downward, and respects the life bounds', () => {
    const W = 390, H = 844;
    for (const seed of [1, 7, 42, 1000]) {
      const c = pickCometPath(mulberry32(seed), W, H, 900, 1600);
      // crosses the full width from one off-screen edge to the other
      expect((c.x0 === -40 && c.x1 === W + 40) || (c.x0 === W + 40 && c.x1 === -40)).toBe(true);
      expect(c.y0).toBeGreaterThanOrEqual(0);
      expect(c.y0).toBeLessThanOrEqual(H * 0.5); // starts in the upper half
      expect(c.y1).toBeGreaterThan(c.y0);        // always drifts downward
      expect(c.lifeMs).toBeGreaterThanOrEqual(900);
      expect(c.lifeMs).toBeLessThanOrEqual(1600);
    }
  });
});
