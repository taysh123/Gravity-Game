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
    // every intensity axis escalates monotonically, not just shake duration
    expect(g.shakeIntensity).toBeGreaterThan(n.shakeIntensity);
    expect(p.shakeIntensity).toBeGreaterThan(g.shakeIntensity);
    expect(b.shakeIntensity).toBeGreaterThanOrEqual(p.shakeIntensity);
    expect(g.cameraPunch).toBeGreaterThan(n.cameraPunch);
    expect(p.cameraPunch).toBeGreaterThan(g.cameraPunch);
    expect(b.cameraPunch).toBeGreaterThan(p.cameraPunch);
    expect(g.bloomBoost).toBeGreaterThan(n.bloomBoost);
    expect(p.bloomBoost).toBeGreaterThan(g.bloomBoost);
    expect(b.bloomBoost).toBeGreaterThan(p.bloomBoost);
    // screen flash only kicks in at the top two tiers
    expect(n.screenFlash).toBe(false);
    expect(g.screenFlash).toBe(false);
    expect(p.screenFlash).toBe(true);
    expect(b.screenFlash).toBe(true);
  });
  it('assigns the right haptic pattern per tier', () => {
    expect(celebrationSpec('normal').hapticKey).toBe('HAPTIC_WIN_PATTERN');
    expect(celebrationSpec('great').hapticKey).toBe('HAPTIC_WIN_PATTERN');
    expect(celebrationSpec('perfect').hapticKey).toBe('HAPTIC_PERFECT_PATTERN');
    expect(celebrationSpec('boss').hapticKey).toBe('HAPTIC_BOSS_PATTERN');
  });
});
