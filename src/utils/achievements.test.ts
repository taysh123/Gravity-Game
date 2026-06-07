import { describe, it, expect } from 'vitest';
import { evaluate, ACHIEVEMENTS, type StatsSnapshot } from './achievements';

const ZERO: StatsSnapshot = {
  levelsCompleted: 0, totalLevels: 64, totalStars: 0, perfectLevels: 0,
  gemsOwned: 0, worldsMastered: 0, portalJumps: 0, deaths: 0, bestDailyStreak: 0,
};

describe('achievements.evaluate', () => {
  it('unlocks nothing at zero progress', () => {
    expect(evaluate(ZERO)).toEqual([]);
  });

  it('unlocks first_win after one completion', () => {
    expect(evaluate({ ...ZERO, levelsCompleted: 1 })).toContain('first_win');
    expect(evaluate({ ...ZERO, levelsCompleted: 1 })).not.toContain('ten_done');
  });

  it('unlocks half/all relative to totalLevels', () => {
    expect(evaluate({ ...ZERO, totalLevels: 64, levelsCompleted: 32 })).toContain('half_done');
    expect(evaluate({ ...ZERO, totalLevels: 64, levelsCompleted: 31 })).not.toContain('half_done');
    expect(evaluate({ ...ZERO, totalLevels: 64, levelsCompleted: 64 })).toContain('all_done');
  });

  it('unlocks star milestones and perfectionist at max', () => {
    expect(evaluate({ ...ZERO, totalStars: 30 })).toContain('stars_30');
    const maxed = evaluate({ ...ZERO, totalLevels: 64, totalStars: 192 });
    expect(maxed).toContain('stars_all');
    expect(maxed).toContain('stars_90');
  });

  it('unlocks event-based achievements', () => {
    expect(evaluate({ ...ZERO, perfectLevels: 10 })).toContain('perfect_10');
    expect(evaluate({ ...ZERO, gemsOwned: 25 })).toContain('gems_25');
    expect(evaluate({ ...ZERO, worldsMastered: 1 })).toContain('master_world');
    expect(evaluate({ ...ZERO, portalJumps: 50 })).toContain('portal_50');
    expect(evaluate({ ...ZERO, deaths: 25 })).toContain('deaths_25');
    expect(evaluate({ ...ZERO, bestDailyStreak: 7 })).toEqual(expect.arrayContaining(['streak_3', 'streak_7']));
  });

  it('has unique ids', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
