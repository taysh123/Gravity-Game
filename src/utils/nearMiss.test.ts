import { describe, it, expect } from 'vitest';
import { nearMiss } from './nearMiss';
import { RETENTION } from '../config/retention.config';

describe('nearMiss', () => {
  it('classifies a death 20px from the goal as near-goal', () => {
    expect(nearMiss({ outcome: 'death', distToGoal: 20 })).toBe('near-goal');
  });

  it('is null for a death far from the goal', () => {
    expect(nearMiss({ outcome: 'death', distToGoal: 500 })).toBeNull();
  });

  it('is null for a death with no distance provided', () => {
    expect(nearMiss({ outcome: 'death' })).toBeNull();
  });

  it('includes the exact configured boundary distance', () => {
    expect(nearMiss({ outcome: 'death', distToGoal: RETENTION.NEAR_GOAL_PX })).toBe('near-goal');
  });

  it('excludes just past the configured boundary distance', () => {
    expect(nearMiss({ outcome: 'death', distToGoal: RETENTION.NEAR_GOAL_PX + 1 })).toBeNull();
  });

  it('classifies a win 200ms over par (and not under par) as just-par', () => {
    expect(nearMiss({ outcome: 'win', timeMs: 5200, parMs: 5000, underPar: false })).toBe('just-par');
  });

  it('is null when the win was actually under par', () => {
    expect(nearMiss({ outcome: 'win', timeMs: 4800, parMs: 5000, underPar: true })).toBeNull();
  });

  it('is null when the win missed par by a wide margin', () => {
    expect(nearMiss({ outcome: 'win', timeMs: 9000, parMs: 5000, underPar: false })).toBeNull();
  });

  it('is null when time is exactly at par (0 over — not a miss)', () => {
    expect(nearMiss({ outcome: 'win', timeMs: 5000, parMs: 5000, underPar: false })).toBeNull();
  });

  it('is null when win params are missing', () => {
    expect(nearMiss({ outcome: 'win', underPar: false })).toBeNull();
  });

  it('includes the exact configured boundary time-over-par', () => {
    expect(nearMiss({ outcome: 'win', timeMs: 5000 + RETENTION.JUST_PAR_MS, parMs: 5000, underPar: false })).toBe('just-par');
  });

  it('excludes just past the configured boundary time-over-par', () => {
    expect(nearMiss({ outcome: 'win', timeMs: 5000 + RETENTION.JUST_PAR_MS + 1, parMs: 5000, underPar: false })).toBeNull();
  });
});
