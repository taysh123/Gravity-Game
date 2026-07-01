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
  it('is deterministic for a given seed and stays on-screen at the start', () => {
    const a = pickCometPath(mulberry32(7), 390, 844, 900, 1600);
    const b = pickCometPath(mulberry32(7), 390, 844, 900, 1600);
    expect(a).toEqual(b);
    expect(a.lifeMs).toBeGreaterThanOrEqual(900);
    expect(a.lifeMs).toBeLessThanOrEqual(1600);
  });
});
