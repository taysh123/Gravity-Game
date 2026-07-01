import { describe, it, expect } from 'vitest';
import { interstitialDecision } from './interstitial';
import { INTERSTITIAL } from '../config/monetization.config';

// Every gate cleared at its exact boundary — the baseline "eligible" context.
// Individual tests perturb one field at a time to probe each rule.
const BASE = {
  now: 1_000_000,
  lastShownMs: 1_000_000 - INTERSTITIAL.MIN_GAP_MS,
  isPremium: false,
  sessionLevels: INTERSTITIAL.GRACE_LEVELS,
  sessionElapsedMs: INTERSTITIAL.GRACE_MS,
  flowProtected: false,
};

describe('interstitialDecision', () => {
  it('allows when every gate is cleared, exactly at each boundary', () => {
    expect(interstitialDecision(BASE)).toEqual({ show: true, reason: 'ok' });
  });

  it('blocks premium even when every other gate is wide open', () => {
    expect(
      interstitialDecision({ ...BASE, isPremium: true, sessionLevels: 99, sessionElapsedMs: 999_999, lastShownMs: 0 }),
    ).toEqual({ show: false, reason: 'premium' });
  });

  it('premium is checked before grace (still reason=premium deep in grace)', () => {
    expect(interstitialDecision({ ...BASE, isPremium: true, sessionLevels: 0, sessionElapsedMs: 0 })).toEqual({
      show: false,
      reason: 'premium',
    });
  });

  it('blocks one level below the level-grace boundary', () => {
    expect(interstitialDecision({ ...BASE, sessionLevels: INTERSTITIAL.GRACE_LEVELS - 1 })).toEqual({
      show: false,
      reason: 'grace',
    });
  });

  it('blocks one ms below the time-grace boundary', () => {
    expect(interstitialDecision({ ...BASE, sessionElapsedMs: INTERSTITIAL.GRACE_MS - 1 })).toEqual({
      show: false,
      reason: 'grace',
    });
  });

  it('grace is checked before flow (reason=grace even if flow-protected)', () => {
    expect(
      interstitialDecision({ ...BASE, sessionLevels: 0, sessionElapsedMs: 0, flowProtected: true }),
    ).toEqual({ show: false, reason: 'grace' });
  });

  it('blocks a flow-protected win once grace is cleared', () => {
    expect(interstitialDecision({ ...BASE, flowProtected: true })).toEqual({ show: false, reason: 'flow' });
  });

  it('flow is checked before the min-gap cap (reason=flow even mid-cooldown)', () => {
    expect(interstitialDecision({ ...BASE, flowProtected: true, lastShownMs: BASE.now })).toEqual({
      show: false,
      reason: 'flow',
    });
  });

  it('blocks 1ms inside the min-gap once grace/flow are clear', () => {
    expect(interstitialDecision({ ...BASE, lastShownMs: BASE.now - (INTERSTITIAL.MIN_GAP_MS - 1) })).toEqual({
      show: false,
      reason: 'capped',
    });
  });

  it('allows exactly at the min-gap boundary', () => {
    expect(interstitialDecision({ ...BASE, lastShownMs: BASE.now - INTERSTITIAL.MIN_GAP_MS })).toEqual({
      show: true,
      reason: 'ok',
    });
  });

  it('allows a never-shown-before context (lastShownMs=0) once past grace', () => {
    expect(interstitialDecision({ ...BASE, lastShownMs: 0, now: INTERSTITIAL.MIN_GAP_MS + 1 })).toEqual({
      show: true,
      reason: 'ok',
    });
  });
});
