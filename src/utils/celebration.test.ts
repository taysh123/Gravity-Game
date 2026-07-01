import { describe, it, expect } from 'vitest';
import { celebrationTier, celebrationSpec } from './celebration';

describe('celebrationTier', () => {
  it('maps stars to tiers and boss overrides all', () => {
    expect(celebrationTier(1, false)).toBe('normal');
    expect(celebrationTier(2, false)).toBe('great');
    expect(celebrationTier(3, false)).toBe('perfect');
    expect(celebrationTier(3, true)).toBe('boss');
    expect(celebrationTier(1, true)).toBe('boss');
  });
});

describe('celebrationSpec', () => {
  it('escalates intensity monotonically normal→great→perfect→boss', () => {
    const n = celebrationSpec('normal'), g = celebrationSpec('great');
    const p = celebrationSpec('perfect'), b = celebrationSpec('boss');
    expect(g.shakeMs).toBeGreaterThan(n.shakeMs);
    expect(p.shakeMs).toBeGreaterThan(g.shakeMs);
    expect(b.shakeMs).toBeGreaterThanOrEqual(p.shakeMs);
    expect(n.screenFlash).toBe(false);
    expect(p.screenFlash).toBe(true);
    expect(b.screenFlash).toBe(true);
  });
  it('assigns the right haptic pattern per tier', () => {
    expect(celebrationSpec('normal').hapticKey).toBe('HAPTIC_WIN_PATTERN');
    expect(celebrationSpec('perfect').hapticKey).toBe('HAPTIC_PERFECT_PATTERN');
    expect(celebrationSpec('boss').hapticKey).toBe('HAPTIC_BOSS_PATTERN');
  });
});
