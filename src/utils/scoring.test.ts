import { describe, it, expect } from 'vitest';
import { computeStars } from './scoring';

describe('computeStars', () => {
  it('awards 0 stars when not completed', () => {
    expect(computeStars({ completed: false, gem: true, timeMs: 1, parMs: 9999 }).stars).toBe(0);
  });

  it('awards 1 star for a bare completion', () => {
    expect(computeStars({ completed: true, gem: false, timeMs: 99999, parMs: 1000 }).stars).toBe(1);
  });

  it('adds a star for the gem (only when completed)', () => {
    expect(computeStars({ completed: true, gem: true, timeMs: 99999, parMs: 1000 }).stars).toBe(2);
    expect(computeStars({ completed: false, gem: true, timeMs: 1, parMs: 1000 }).stars).toBe(0);
  });

  it('adds a star for finishing at or under par', () => {
    expect(computeStars({ completed: true, gem: false, timeMs: 1000, parMs: 1000 }).stars).toBe(2);
    expect(computeStars({ completed: true, gem: false, timeMs: 1001, parMs: 1000 }).stars).toBe(1);
  });

  it('awards all 3 stars for completion + gem + under par', () => {
    const r = computeStars({ completed: true, gem: true, timeMs: 800, parMs: 1000 });
    expect(r.stars).toBe(3);
    expect(r).toMatchObject({ completed: true, gem: true, underPar: true });
  });

  it('ignores efficiency when no par time is set', () => {
    expect(computeStars({ completed: true, gem: true, timeMs: 50 }).stars).toBe(2);
  });
});
